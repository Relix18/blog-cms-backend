import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import prisma from "../lib/db.js";
import ErrorHandler from "../utils/errorHandler.js";

export const relatedPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { value, currentId } = req.body;

    if (!value) {
      return next(new ErrorHandler(400, "Category value is required"));
    }

    const post = await prisma.category.findMany({
      where: { value },
      include: {
        post: {
          include: {
            author: true,
          },
          where: {
            id: {
              not: currentId,
            },
          },
          orderBy: {
            views: "desc",
          },
          take: 3,
        },
      },
    });

    res.status(200).json({
      success: true,
      post,
    });
  }
);

export const featuredPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const featuredPost = await prisma.post.findMany({
      where: { published: true },
      orderBy: {
        views: "desc",
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
      take: 3,
    });

    res.status(200).json({
      success: true,
      featuredPost,
    });
  }
);

export const latestPost = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const latestPost = await prisma.post.findMany({
      where: { published: true },
      orderBy: {
        publishedAt: "desc",
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
      take: 10,
    });

    res.status(200).json({
      success: true,
      latestPost,
    });
  }
);

export const popularTags = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const popularTags = await prisma.tag.findMany({
      select: {
        id: true,
        value: true,
        label: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
      take: 20,
    });

    res.status(200).json({
      success: true,
      popularTags,
    });
  }
);

export const featuredAuthor = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const authorPostViews = await prisma.post.groupBy({
      by: ["authorId"],
      _sum: {
        views: true,
      },
      orderBy: {
        _sum: {
          views: "desc",
        },
      },
      take: 1,
    });

    const featuredAuthor = await prisma.user.findUnique({
      where: {
        id: authorPostViews[0].authorId,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            posts: true,
          },
        },

        profile: {
          select: {
            avatar: true,
            bio: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      featuredAuthor,
    });
  }
);
