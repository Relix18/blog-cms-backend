import { TryCatch } from "../middlewares/error.js";
import prisma from "../lib/db.js";
import ErrorHandler from "../utils/errorHandler.js";
export const relatedPost = TryCatch(async (req, res, next) => {
    const { value, currentId } = req.body;
    if (!value) {
        return next(new ErrorHandler(400, "Category value is required"));
    }
    const post = await prisma.category.findMany({
        where: { value },
        include: {
            posts: {
                include: {
                    post: {
                        include: {
                            author: true,
                        },
                    },
                },
                where: {
                    postId: {
                        not: currentId,
                    },
                },
                orderBy: {
                    post: {
                        views: "desc",
                    },
                },
                take: 3,
            },
        },
    });
    res.status(200).json({
        success: true,
        post,
    });
});
export const featuredPost = TryCatch(async (req, res, next) => {
    const featuredPost = await prisma.post.findMany({
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
});
export const latestPost = TryCatch(async (req, res, next) => {
    const latestPost = await prisma.post.findMany({
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
});
export const popularCategory = TryCatch(async (req, res, next) => {
    const popularCategory = await prisma.category.findMany({
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
        popularCategory,
    });
});
export const featuredAuthor = TryCatch(async (req, res, next) => {
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
});