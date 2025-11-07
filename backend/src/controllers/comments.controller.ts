// =============================================================================
// Comments Controller
// =============================================================================
// Handles video comments and replies
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { comments, videos, users } from "../db/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

// =============================================================================
// Comment Operations
// =============================================================================

/**
 * Add a comment to a video
 * POST /api/videos/:id/comments
 */
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey, content, parentId } = req.body;

    if (!userPubkey || !content) {
      return res.status(400).json({
        error: "User pubkey and content are required",
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        error: "Comment content cannot be empty",
      });
    }

    // Check if video exists
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // If parentId is provided, check if parent comment exists
    if (parentId) {
      const parentComment = await db
        .select()
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1);

      if (parentComment.length === 0) {
        return res.status(404).json({ error: "Parent comment not found" });
      }
    }

    // Create comment
    const newComment = await db
      .insert(comments)
      .values({
        videoId: Number(id),
        userPubkey,
        content: content.trim(),
        parentId: parentId || null,
      })
      .returning();

    // Increment comment count in videos table
    await db
      .update(videos)
      .set({
        commentCount: sql`${videos.commentCount} + 1`,
      })
      .where(eq(videos.id, Number(id)));

    res.status(201).json({
      success: true,
      comment: newComment[0],
      message: "Comment added successfully",
    });
  } catch (error: any) {
    console.error("Add comment error:", error);
    res.status(500).json({
      error: "Failed to add comment",
      details: error.message,
    });
  }
};

/**
 * Get comments for a video
 * GET /api/videos/:id/comments
 */
export const getVideoComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Get top-level comments (no parent)
    const topLevelComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.videoId, Number(id)), isNull(comments.parentId)))
      .orderBy(desc(comments.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await db
          .select()
          .from(comments)
          .where(eq(comments.parentId, comment.id))
          .orderBy(desc(comments.createdAt));

        // Get user info for comment
        const user = await db
          .select({
            pubkey: users.pubkey,
            accountName: users.accountName,
          })
          .from(users)
          .where(eq(users.pubkey, comment.userPubkey))
          .limit(1);

        // Get user info for replies
        const repliesWithUsers = await Promise.all(
          replies.map(async (reply) => {
            const replyUser = await db
              .select({
                pubkey: users.pubkey,
                accountName: users.accountName,
              })
              .from(users)
              .where(eq(users.pubkey, reply.userPubkey))
              .limit(1);

            return {
              ...reply,
              user: replyUser[0] || null,
            };
          })
        );

        return {
          ...comment,
          user: user[0] || null,
          replies: repliesWithUsers,
          replyCount: replies.length,
        };
      })
    );

    res.json({
      success: true,
      comments: commentsWithReplies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: topLevelComments.length,
      },
    });
  } catch (error: any) {
    console.error("Get comments error:", error);
    res.status(500).json({
      error: "Failed to get comments",
      details: error.message,
    });
  }
};

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.body;

    if (!userPubkey) {
      return res.status(400).json({ error: "User pubkey is required" });
    }

    // Get comment
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, Number(id)))
      .limit(1);

    if (comment.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment
    if (comment[0].userPubkey !== userPubkey) {
      return res.status(403).json({
        error: "You can only delete your own comments",
      });
    }

    // Delete comment (replies will also be deleted if we add cascade)
    await db.delete(comments).where(eq(comments.id, Number(id)));

    // Decrement comment count
    await db
      .update(videos)
      .set({
        commentCount: sql`GREATEST(${videos.commentCount} - 1, 0)`,
      })
      .where(eq(videos.id, comment[0].videoId));

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      error: "Failed to delete comment",
      details: error.message,
    });
  }
};

/**
 * Update a comment
 * PUT /api/comments/:id
 */
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey, content } = req.body;

    if (!userPubkey || !content) {
      return res.status(400).json({
        error: "User pubkey and content are required",
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        error: "Comment content cannot be empty",
      });
    }

    // Get comment
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, Number(id)))
      .limit(1);

    if (comment.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment
    if (comment[0].userPubkey !== userPubkey) {
      return res.status(403).json({
        error: "You can only edit your own comments",
      });
    }

    // Update comment
    const updatedComment = await db
      .update(comments)
      .set({
        content: content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, Number(id)))
      .returning();

    res.json({
      success: true,
      comment: updatedComment[0],
      message: "Comment updated successfully",
    });
  } catch (error: any) {
    console.error("Update comment error:", error);
    res.status(500).json({
      error: "Failed to update comment",
      details: error.message,
    });
  }
};

/**
 * Get user's comments
 * GET /api/users/:pubkey/comments
 */
export const getUserComments = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const userComments = await db
      .select()
      .from(comments)
      .where(eq(comments.userPubkey, pubkey))
      .orderBy(desc(comments.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get video info for each comment
    const commentsWithVideos = await Promise.all(
      userComments.map(async (comment) => {
        const video = await db
          .select({
            id: videos.id,
            title: videos.title,
            thumbnailUrl: videos.thumbnailUrl,
          })
          .from(videos)
          .where(eq(videos.id, comment.videoId))
          .limit(1);

        return {
          ...comment,
          video: video[0] || null,
        };
      })
    );

    res.json({
      success: true,
      comments: commentsWithVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userComments.length,
      },
    });
  } catch (error: any) {
    console.error("Get user comments error:", error);
    res.status(500).json({
      error: "Failed to get user comments",
      details: error.message,
    });
  }
};
