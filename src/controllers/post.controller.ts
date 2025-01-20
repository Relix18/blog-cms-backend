import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { IPost, IUser } from "../types/types";
import ErrorHandler from "../utils/errorHandler.js";
import prisma from "../lib/db.js";
import { v2 as cloudinary } from "cloudinary";
import calculateReadingTime from "../utils/readingTime.js";
import pusher from "../utils/pusher.js";
import sendEmail from "../utils/sendMail.js";

//Author
export const createPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    let {
      title,
      slug,
      content,
      category,
      tags,
      description,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeyword,
      publish,
    } = req.body as IPost & { publish: boolean };
    const user = req.user;

    if (!user) {
      return next(
        new ErrorHandler(400, "Please login to access the reasource")
      );
    }

    if (
      !title ||
      !content ||
      !slug ||
      !description ||
      !featuredImage ||
      !category ||
      !tags ||
      !metaTitle ||
      !metaDescription ||
      !metaKeyword
    ) {
      return next(new ErrorHandler(400, "Please enter all fields"));
    }

    let featuredImageId;
    try {
      let myCloud = await cloudinary.uploader.upload(featuredImage, {
        folder: "blog/post",
      });
      featuredImage = myCloud.secure_url;
      featuredImageId = myCloud.public_id;
    } catch (error) {
      return next(new ErrorHandler(400, "An error occurred"));
    }

    const tagsToConnect = await Promise.all(
      tags.map(async (tag) => {
        const label = tag.charAt(0).toUpperCase() + tag.slice(1);
        const value = tag.toLowerCase();
        const existingCategory = await prisma.tag.upsert({
          where: { value },
          update: {},
          create: { value, label },
        });
        return { id: existingCategory.id };
      })
    );

    const label = category.charAt(0).toUpperCase() + category.slice(1);
    const value = category.toLowerCase();

    const categoryId = await prisma.category.upsert({
      where: { value },
      update: {},
      create: { value, label },
    });

    let isSlugExists = await prisma.post.findUnique({
      where: { slug },
    });

    let count = 1;

    while (isSlugExists) {
      slug = `${slug}-${count}`;
      isSlugExists = await prisma.post.findUnique({ where: { slug } });
      count++;
    }

    const minRead = calculateReadingTime(content);

    const post = await prisma.post.create({
      data: {
        title,
        content,
        featuredImage,
        featuredImageId,
        description,
        minRead,
        slug,
        authorId: user.id,
        categoryId: categoryId.id,
        tags: {
          create: tagsToConnect.map((tag) => ({
            tag: { connect: { id: tag.id } },
          })),
        },
        metaTitle,
        metaDescription,
        metaKeyword,
      },
    });

    if (publish) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          published: true,
          publishedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Your post has been created and published successfully.",
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  }
);

export const publishPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const id = req.params.id;

    const postId = parseInt(id);

    if (!user) {
      return next(new ErrorHandler(400, "Please login to access the resource"));
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        published: true,
        publishedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Your post is published and available to readers.",
    });
  }
);

export const getAuthorPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new ErrorHandler(400, "Please login to access the resource"));
    }

    const post = await prisma.post.findMany({
      where: { authorId: user.id },
      include: {
        likes: true,
        comments: true,
        category: true,
        tags: {
          select: {
            tag: {
              select: {
                value: true,
                label: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      post,
    });
  }
);

export const getSinglePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params.slug;

    const post = await prisma.post.findUnique({
      where: { slug },

      include: {
        author: {
          select: {
            name: true,
            email: true,
            id: true,
          },
        },
        category: true,
        tags: {
          select: {
            tag: {
              select: {
                value: true,
                label: true,
              },
            },
          },
        },
        likes: true,
      },
    });

    if (!post) {
      return next(new ErrorHandler(404, "Post not found"));
    }

    res.status(200).json({
      success: true,
      post,
    });
  }
);

export const updatePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const postId = parseInt(id);
    let {
      title,
      slug,
      content,
      category,
      tags,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeyword,
    } = req.body as IPost;

    if (
      !title ||
      !content ||
      !slug ||
      !featuredImage ||
      !category ||
      !tags ||
      !metaDescription ||
      !metaTitle ||
      !metaKeyword
    ) {
      return next(new ErrorHandler(400, "Please enter all fields"));
    }

    const tagsToConnect = await Promise.all(
      tags.map(async (tag) => {
        const label = tag.charAt(0).toUpperCase() + tag.slice(1);
        const value = tag.toLowerCase();
        const existingTags = await prisma.tag.upsert({
          where: { value },
          update: {},
          create: { label, value },
        });
        return { id: existingTags.id };
      })
    );

    const label = category.charAt(0).toUpperCase() + category.slice(1);
    const value = category.toLowerCase();

    const categoryId = await prisma.category.upsert({
      where: { value },
      update: {},
      create: { value, label },
    });

    await prisma.postTags.deleteMany({
      where: { postId },
    });

    const oldPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    let featuredImageId;
    if (!featuredImage.startsWith("https://res.cloudinary.com")) {
      try {
        await cloudinary.uploader.destroy(oldPost?.featuredImageId as string);
        let myCloud = await cloudinary.uploader.upload(featuredImage, {
          folder: "blog/post",
        });
        featuredImage = myCloud.secure_url;
        featuredImageId = myCloud.public_id;
      } catch (error) {
        return next(new ErrorHandler(400, "An error occurred"));
      }
    }

    const minRead = calculateReadingTime(content);

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        featuredImage,
        featuredImageId,
        minRead,
        slug,
        categoryId: categoryId.id,
        tags: {
          create: tagsToConnect.map((tag) => ({
            tag: { connect: { id: tag.id } },
          })),
        },
        metaTitle,
        metaDescription,
        metaKeyword,
      },
    });

    res.status(200).json({
      success: true,
      post,
    });
  }
);

export const deletePost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const user = req.user;
    const postId = parseInt(id);

    const post = await prisma.post.findFirst({
      where: { id: postId, authorId: user?.id },
    });

    if (!post) {
      return next(new ErrorHandler(400, "You are not an author of this post."));
    }

    if (post.featuredImageId) {
      await cloudinary.uploader.destroy(post.featuredImageId);
    }

    await prisma.reply.deleteMany({
      where: {
        comment: {
          postId,
        },
      },
    });

    await prisma.comment.deleteMany({
      where: {
        postId,
      },
    });

    await prisma.like.deleteMany({
      where: { postId },
    });

    await prisma.postTags.deleteMany({
      where: { postId },
    });

    await prisma.post.delete({
      where: {
        id: postId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Your post has been deleted.",
    });
  }
);

//User
export const getAllPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const posts = await prisma.post.findMany({
      where: { published: true },

      include: {
        category: true,
        tags: {
          select: {
            tag: {
              select: {
                value: true,
                label: true,
              },
            },
          },
        },
        author: {
          select: {
            name: true,
            email: true,
            id: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      posts,
    });
  }
);

export const getCategory = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            post: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      categories,
    });
  }
);

export const getTags = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      tags,
    });
  }
);

export const postComment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    const user = req.user as IUser;
    const { comment } = req.body;

    if (!comment) {
      return next(new ErrorHandler(400, "Comment is empty"));
    }

    const post = await prisma.post.findUnique({
      where: { slug },
    });

    if (!post) {
      return next(new ErrorHandler(404, "Post not found"));
    }

    await prisma.comment.create({
      data: {
        content: comment,
        userId: user.id,
        postId: post.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Commented successfully",
    });
  }
);

export const getComments = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    if (!slug) {
      return next(new ErrorHandler(404, "Post not found"));
    }

    const comments = await prisma.comment.findMany({
      where: { post: { slug } },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        replies: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profile: {
                  select: {
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            profile: {
              select: {
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!comments) {
      return next(new ErrorHandler(404, "No comments found on this post"));
    }

    res.status(200).json({
      success: true,
      comments,
    });
  }
);

export const commentReply = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as IUser;
    const { reply, commentId } = req.body;

    if (!reply) {
      return next(new ErrorHandler(400, "Comment is empty"));
    }

    await prisma.reply.create({
      data: {
        userId: id,
        commentId,
        content: reply,
      },
    });

    res.status(200).json({
      success: true,
      message: "Replied Successfully",
    });
  }
);

export const postviews = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    if (!slug) {
      return next(new ErrorHandler(400, "slug is required"));
    }

    await prisma.post.update({
      where: { slug },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Views updated successfully",
    });
  }
);

export const postLike = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as IUser;
    const { postId } = req.body;

    if (!id) {
      return next(new ErrorHandler(401, "Please log in to like the post"));
    }

    if (!postId) {
      return next(new ErrorHandler(400, "Post ID is required"));
    }

    const isPublished = await prisma.post.findUnique({
      where: { id: postId, published: true },
    });

    if (!isPublished) {
      return next(new ErrorHandler(400, "Post is not published yet."));
    }

    const existingLike = await prisma.like.findFirst({
      where: { userId: id, postId },
    });

    let message = "";
    let likeCount = 0;

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      message = "Post unliked successfully";
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId: id,
        },
      });
      message = "Post liked successfully";
    }

    likeCount = await prisma.like.count({ where: { postId } });

    await pusher.trigger("post-channel", "like-updated", {
      postId,
      likeCount,
    });

    res.status(200).json({
      success: true,
      message,
      likeCount,
    });
  }
);

export const likedPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.user as IUser;

    if (!id) {
      return next(
        new ErrorHandler(401, "Please log in to access this resource")
      );
    }

    const likedPost = await prisma.like.findMany({
      where: { userId: id, post: { published: true } },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      likedPost,
    });
  }
);

export const getRecentActivity = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const [likedPosts, comments, replies] = await Promise.all([
      prisma.like.findMany({
        where: { userId, post: { published: true } },
        include: {
          post: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.comment.findMany({
        where: { userId, post: { published: true } },
        include: { post: true, user: true, replies: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.reply.findMany({
        where: { userId, comment: { post: { published: true } } },
        include: {
          comment: { include: { post: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const activities = [
      ...likedPosts.map((like) => ({
        type: "LIKE",
        createdAt: like.createdAt,
        post: {
          id: like.postId,
          slug: like.post.slug,
          title: like.post.title,
          description: like.post.description,
        },
      })),
      ...comments.map((comment) => ({
        type: "COMMENT",
        content: comment.content,
        createdAt: comment.createdAt,
        post: {
          id: comment.postId,
          slug: comment.post.slug,
          title: comment.post.title,
          description: comment.post.description,
        },
      })),
      ...replies.map((reply) => ({
        type: "REPLY",
        content: reply.content,
        createdAt: reply.createdAt,
        post: {
          id: reply.comment.postId,
          slug: reply.comment.post.slug,
          title: reply.comment.post.title,
          description: reply.comment.post.description,
        },
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      activities,
    });
  }
);

//Admin
export const getAllPostAdmin = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const posts = await prisma.post.findMany({
      include: {
        category: true,
        author: true,
        tags: {
          include: {
            tag: {
              select: {
                value: true,
                label: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      posts,
    });
  }
);

export const unpublishPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.user?.id;
    const { postId, reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (user?.role !== "ADMIN") {
      return next(
        new ErrorHandler(400, "You are not authorized to perform this action.")
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
      },
    });

    if (!post) {
      return next(new ErrorHandler(404, "Post not found."));
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        published: false,
      },
    });

    const settings = await prisma.siteSettings.findFirst({});

    const data = {
      postTitle: post.title,
      reason,
      authorName: post.author.name,
      siteName: settings?.siteName,
    };

    try {
      await sendEmail({
        email: post.author.email,
        subject: "Your Post Has Been Unpublished",
        template: "unpublish-post.ejs",
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(400, error as string));
    }

    res.status(200).json({
      success: true,
      message: "Post unpublished and notified the author.",
    });
  }
);

export const editCategory = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id, label, value } = req.body;

    if (!label || !value) {
      return next(new ErrorHandler(400, "Please provide data."));
    }

    const categories = await prisma.category.update({
      where: { id },
      data: {
        value,
        label,
      },
    });

    res.status(200).json({
      success: true,
      categories,
    });
  }
);

export const editTag = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id, label, value } = req.body;

    if (!label || !value) {
      return next(new ErrorHandler(400, "Please provide data."));
    }

    const tags = await prisma.tag.update({
      where: { id },
      data: {
        value,
        label,
      },
    });

    res.status(200).json({
      success: true,
      tags,
    });
  }
);

export const deletePosts = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    let postTitle = post?.title;
    let authorName = post?.author.name;
    let authorEmail = post?.author.email;

    await prisma.reply.deleteMany({
      where: {
        comment: {
          postId,
        },
      },
    });

    await prisma.comment.deleteMany({
      where: {
        postId,
      },
    });

    await prisma.like.deleteMany({
      where: { postId },
    });

    await prisma.postTags.deleteMany({
      where: { postId },
    });

    await prisma.post.delete({
      where: {
        id: postId,
      },
    });

    const settings = await prisma.siteSettings.findFirst({});

    const data = { postTitle, authorName, siteName: settings?.siteName };

    try {
      await sendEmail({
        email: authorEmail!,
        subject: "Your Post Has Been Deleted",
        template: "delete-post.ejs",
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(400, error as string));
    }

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  }
);

export const deleteComment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return next(new ErrorHandler(404, "Comment not found"));
    }

    await prisma.reply.deleteMany({
      where: {
        commentId: id,
      },
    });

    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  }
);

export const deleteReply = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.body;

    const reply = await prisma.reply.findFirst({
      where: { id },
    });

    if (!reply) {
      return next(new ErrorHandler(404, "Reply not found"));
    }

    await prisma.reply.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Reply deleted successfully",
    });
  }
);
