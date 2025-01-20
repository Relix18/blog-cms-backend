import { NextFunction, Request, Response } from "express";

export type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;

export interface IUser {
  name: string;
  email: string;
  password?: string | null;
  id: string;
  role: "USER" | "AUTHOR" | "ADMIN";
  resetPasswordToken: string | null;
  resetPasswordExpire: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegistration {
  name: string;
  email: string;
  password: string;
}

export interface IPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  category?: string;
  categoryId: number;
  tags?: string[];
  description: string;
  featuredImage: string | null;
  published: boolean;
  publishedAt: Date | null;
  author: IUser;
  authorId: string;
  views: number;
  likes: ILike;
  minRead: number;
  comments: IComment;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeyword: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// interface Category {
//   id: number;
//   value: string;
//   label: string;
//   createdAt: Date;
//   updateAt: Date;
// }

export interface ISocialAuth {
  name: string;
  email: string;
  avatar: string;
}

export interface IReply {
  id: number;
  content: string;
  user: IUser;
  userId: string;
  commentId: number;
  comment: IComment;
  createdAt: Date;
}

export interface ReplyData {
  user: {
    name: string;
    email: string;
  };
  comment: {
    id: number;
    user: {
      name: string;
      email: string;
    };
    post: {
      id: number;
      title: string;
      slug: string;
    };
    content: string;
  };
}

export interface CommentData {
  user: {
    name: string;
    email: string;
  };
  post: {
    id: number;
    title: string;
    slug: string;
  };
}

export interface IComment {
  id: number;
  content: string;
  user: IUser;
  userId: String;
  postId: number;
  post: IPost;
  replies: IReply[];
  createdAt: Date;
}

export interface ILike {
  id: number;
  postId: number;
  post: IPost;
  userId: string;
  createdAt: Date;
}

export interface MonthlyMetrics {
  month: string;
  views: number;
  likes: number;
  comments: number;
  replies: number;
  posts: number;
  totalEngagement: number;
  viewsGrowth?: number;
  likesGrowth?: number;
  commentsGrowth?: number;
  repliesGrowth?: number;
}

export interface PostAnalytics {
  postId: number;
  title: string;
  views: number;
  likes: number;
  comments: number;
  replies: number;
  totalEngagement: number;
  createdAt: Date;
}

export interface DetailedAnalytics {
  monthlyAnalytics: MonthlyMetrics[];
  postAnalytics: PostAnalytics[];
}

export interface MonthlyUserActivity {
  month: string;
  newUsers: number;
  activeUsers: number;
  interactions: {
    views: number;
    likes: number;
    comments: number;
    replies: number;
  };
  newAuthors: number;
}

export interface CategoryMetric {
  name: string;
  views: number;
  likes: number;
}

export interface ChartData {
  month: string;
  views: number;
  posts: Array<{ id: number; title: string; views: number }>;
}

export interface UserChartData {
  month: string;
  users: number;
}

export interface DetailedPlatformUserAnalytics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  authors: number;
  monthlyActivity: MonthlyUserActivity[];
  allMonthlyActivity: MonthlyUserActivity[];
}

export interface GrowthDetail {
  percentage: string;
  currentPeriod: number;
  lastPeriod: number;
}

export type GrowthReport = {
  month: string;
  count: number;
  growthRate: number | null;
};
