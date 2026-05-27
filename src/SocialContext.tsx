import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    Timestamp,
} from "firebase/firestore";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../service/firebaseConfig";

export type SocialUser = {
  uid: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
};

export type ReactionType = "like" | "clap" | "eco";

export type PostReaction = {
  id: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
};

export type FollowerEvent = {
  uid: string;
  createdAt: string;
};

export type PostComment = {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  type: "achievement" | "post" | "share";
  createdAt: string;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
  myReaction: ReactionType | null;
  reactionSummary: Record<ReactionType, number>;
  comments: PostComment[];
  recentReactions?: PostReaction[];
  achievement?: {
    totalGrams: number;
    entriesCount: number;
  };
  sharedPostId?: string;
};

type ShareAchievementInput = {
  content: string;
  totalGrams: number;
  entriesCount: number;
  initialComments?: string[];
};

type SocialContextValue = {
  users: SocialUser[];
  feedPosts: SocialPost[];
  myPosts: SocialPost[];
  followingFeedPosts: SocialPost[];
  followingIds: Set<string>;
  followerEvents: FollowerEvent[];
  currentProfile: SocialUser | null;
  loading: boolean;
  followUser: (targetUid: string) => Promise<void>;
  reactToPost: (postId: string, reaction: ReactionType) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  shareAchievement: (input: ShareAchievementInput) => Promise<void>;
  updateProfilePhoto: (avatarUrl: string) => Promise<void>;
};

const SocialContext = createContext<SocialContextValue | null>(null);

function toIsoDate(
  value: Timestamp | Date | string | null | undefined,
): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<SocialUser | null>(null);
  const [feedPosts, setFeedPosts] = useState<SocialPost[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerEvents, setFollowerEvents] = useState<FollowerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const currentUid = currentUser?.uid;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setUsers([]);
      setCurrentUserProfile(null);
      setFeedPosts([]);
      setFollowingIds(new Set());
      setFollowerEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const user = auth.currentUser;
    void setDoc(
      doc(db, "users", currentUid),
      {
        uid: currentUid,
        username:
          user?.displayName?.trim() || user?.email?.split("@")[0] || "Usuario",
        email: user?.email || "",
        emailLower: user?.email?.trim().toLowerCase() || "",
        createdAt: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
      },
      { merge: true },
    );

    const currentUserRef = doc(db, "users", currentUid);
    const unsubscribeCurrentUser = onSnapshot(
      currentUserRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCurrentUserProfile(null);
          return;
        }

        const data = snapshot.data() as Partial<SocialUser>;
        setCurrentUserProfile({
          uid: snapshot.id,
          username: data.username || "Usuario",
          email: data.email,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          followersCount: Number(data.followersCount || 0),
          followingCount: Number(data.followingCount || 0),
        });
      },
      (error) => {
        console.warn("Current user listener failed:", error);
      },
    );

    const usersQuery = query(
      collection(db, "users"),
      orderBy("username", "asc"),
      limit(100),
    );
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const nextUsers: SocialUser[] = snapshot.docs.map((snap) => {
          const data = snap.data() as Partial<SocialUser>;
          return {
            uid: snap.id,
            username: data.username || "Usuario",
            email: data.email,
            avatarUrl: data.avatarUrl,
            bio: data.bio,
            followersCount: Number(data.followersCount || 0),
            followingCount: Number(data.followingCount || 0),
          };
        });
        setUsers(nextUsers);
      },
      (error) => {
        if (error.code === "permission-denied") {
          setUsers([]);
          return;
        }
        console.warn("Users listener failed:", error);
      },
    );

    const followingQuery = query(
      collection(db, "users", currentUid, "following"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeFollowing = onSnapshot(
      followingQuery,
      (snapshot) => {
        setFollowingIds(new Set(snapshot.docs.map((snap) => snap.id)));
      },
      (error) => {
        if (error.code === "permission-denied") {
          setFollowingIds(new Set());
          return;
        }
        console.warn("Following listener failed:", error);
      },
    );

    const followersQuery = query(
      collection(db, "users", currentUid, "followers"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeFollowers = onSnapshot(
      followersQuery,
      (snapshot) => {
        setFollowerEvents(
          snapshot.docs.map((snap) => ({
            uid: snap.id,
            createdAt: toIsoDate(snap.data().createdAt),
          })),
        );
      },
      (error) => {
        if (error.code === "permission-denied") {
          setFollowerEvents([]);
          return;
        }
        console.warn("Followers listener failed:", error);
      },
    );

    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(40),
    );
    const unsubscribePosts = onSnapshot(
      postsQuery,
      async (snapshot) => {
        try {
          const nextPosts = await Promise.all(
            snapshot.docs.map(async (snap) => {
              const data = snap.data() as any;

              const reactionsSnapshot = await getDocs(
                collection(db, "posts", snap.id, "reactions"),
              );
              const commentsSnapshot = await getDocs(
                query(
                  collection(db, "posts", snap.id, "comments"),
                  orderBy("createdAt", "desc"),
                  limit(4),
                ),
              );

          const reactionSummary: Record<ReactionType, number> = {
            like: 0,
            clap: 0,
            eco: 0,
          };

          let myReaction: ReactionType | null = null;

          reactionsSnapshot.forEach((reactionDoc) => {
            const reactionData = reactionDoc.data() as {
              type?: ReactionType;
              userId?: string;
            };
            const type = reactionData.type;
            if (type && reactionSummary[type] !== undefined) {
              reactionSummary[type] += 1;
            }
            if (reactionData.userId === currentUid && type) {
              myReaction = type;
            }
          });

          const comments: PostComment[] = commentsSnapshot.docs.map(
            (commentDoc) => {
              const commentData = commentDoc.data() as any;
              return {
                id: commentDoc.id,
                userId: commentData.userId || "",
                username: commentData.username || "Usuario",
                avatarUrl: commentData.avatarUrl,
                text: commentData.text || "",
                createdAt: toIsoDate(commentData.createdAt),
              };
            },
          );

          const recentReactions: PostReaction[] = reactionsSnapshot.docs
            .map((reactionDoc) => {
              const reactionData = reactionDoc.data() as {
                type?: ReactionType;
                userId?: string;
                createdAt?: Timestamp | Date | string | null;
              };

              if (!reactionData.type || !reactionData.userId) {
                return null;
              }

              return {
                id: reactionDoc.id,
                userId: reactionData.userId,
                type: reactionData.type,
                createdAt: toIsoDate(reactionData.createdAt),
              };
            })
            .filter((item): item is PostReaction => item !== null)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

          return {
            id: snap.id,
            authorId: data.authorId || "",
            authorName: "",
            content: data.content || "",
            type: (data.type || "post") as "achievement" | "post" | "share",
            createdAt: toIsoDate(data.createdAt),
            reactionsCount: Number(data.reactionsCount || 0),
            commentsCount: Number(data.commentsCount || 0),
            sharesCount: Number(data.sharesCount || 0),
            myReaction,
            reactionSummary,
            comments,
            recentReactions,
            achievement: data.achievement,
            sharedPostId: data.sharedPostId,
          } as SocialPost;
        }),
      );

          setFeedPosts(nextPosts);
          setLoading(false);
        } catch (error) {
          console.warn("Posts hydration failed:", error);
          setFeedPosts([]);
          setLoading(false);
        }
      },
      (error) => {
        if (error.code === "permission-denied") {
          setFeedPosts([]);
          setLoading(false);
          return;
        }
        console.warn("Posts listener failed:", error);
      },
    );

    return () => {
      unsubscribeCurrentUser();
      unsubscribeUsers();
      unsubscribeFollowing();
      unsubscribeFollowers();
      unsubscribePosts();
    };
  }, [currentUid]);

  const usersById = useMemo(() => {
    const map = new Map<string, SocialUser>();
    users.forEach((user) => {
      map.set(user.uid, user);
    });
    return map;
  }, [users]);

  const currentProfileFromList = currentUid ? usersById.get(currentUid) || null : null;
  const currentProfile = currentUserProfile || currentProfileFromList;

  const enrichedPosts = useMemo(
    () =>
      feedPosts.map((post) => {
        const author = post.authorId === currentUid ? currentProfile : usersById.get(post.authorId);
        return {
          ...post,
          authorName: author?.username || "Usuario",
          authorAvatar: author?.avatarUrl,
        };
      }),
    [feedPosts, usersById, currentUid, currentProfile],
  );

  const myPosts = useMemo(
    () => enrichedPosts.filter((post) => post.authorId === currentUid),
    [enrichedPosts, currentUid],
  );

  const followingFeedPosts = useMemo(
    () =>
      enrichedPosts.filter(
        (post) =>
          post.authorId === currentUid || followingIds.has(post.authorId),
      ),
    [enrichedPosts, followingIds, currentUid],
  );

  const followUser = async (targetUid: string) => {
    if (!currentUid || targetUid === currentUid) {
      return;
    }

    const myFollowingRef = doc(db, "users", currentUid, "following", targetUid);
    const theirFollowerRef = doc(
      db,
      "users",
      targetUid,
      "followers",
      currentUid,
    );
    const myUserRef = doc(db, "users", currentUid);
    const targetUserRef = doc(db, "users", targetUid);

    await runTransaction(db, async (transaction) => {
      const [myFollowingDoc, myUserDoc, targetUserDoc] = await Promise.all([
        transaction.get(myFollowingRef),
        transaction.get(myUserRef),
        transaction.get(targetUserRef),
      ]);

      const myFollowingCount = Number(myUserDoc.data()?.followingCount || 0);
      const targetFollowersCount = Number(
        targetUserDoc.data()?.followersCount || 0,
      );

      if (myFollowingDoc.exists()) {
        transaction.delete(myFollowingRef);
        transaction.delete(theirFollowerRef);
        transaction.set(
          myUserRef,
          { followingCount: Math.max(0, myFollowingCount - 1) },
          { merge: true },
        );
        transaction.set(
          targetUserRef,
          { followersCount: Math.max(0, targetFollowersCount - 1) },
          { merge: true },
        );
        return;
      }

      transaction.set(myFollowingRef, {
        uid: targetUid,
        createdAt: serverTimestamp(),
      });
      transaction.set(theirFollowerRef, {
        uid: currentUid,
        createdAt: serverTimestamp(),
      });
      transaction.set(
        myUserRef,
        { followingCount: myFollowingCount + 1 },
        { merge: true },
      );
      transaction.set(
        targetUserRef,
        { followersCount: targetFollowersCount + 1 },
        { merge: true },
      );
    });
  };

  const reactToPost = async (postId: string, reaction: ReactionType) => {
    if (!currentUid) {
      return;
    }

    const postRef = doc(db, "posts", postId);
    const reactionRef = doc(db, "posts", postId, "reactions", currentUid);

    await runTransaction(db, async (transaction) => {
      const [postDoc, reactionDoc] = await Promise.all([
        transaction.get(postRef),
        transaction.get(reactionRef),
      ]);

      const currentReactions = Number(postDoc.data()?.reactionsCount || 0);

      if (!reactionDoc.exists()) {
        transaction.set(reactionRef, {
          userId: currentUid,
          type: reaction,
          createdAt: serverTimestamp(),
        });
        transaction.set(
          postRef,
          { reactionsCount: currentReactions + 1 },
          { merge: true },
        );
        return;
      }

      const prevType = (reactionDoc.data()?.type || "") as ReactionType;

      if (prevType === reaction) {
        transaction.delete(reactionRef);
        transaction.set(
          postRef,
          { reactionsCount: Math.max(0, currentReactions - 1) },
          { merge: true },
        );
        return;
      }

      transaction.set(
        reactionRef,
        {
          userId: currentUid,
          type: reaction,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  };

  const addComment = async (postId: string, text: string) => {
    if (!currentUid || !text.trim()) {
      return;
    }

    const profile = usersById.get(currentUid);

    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: currentUid,
      username: profile?.username || "Usuario",
      avatarUrl: profile?.avatarUrl || "",
      text: text.trim(),
      createdAt: serverTimestamp(),
    });

    const postRef = doc(db, "posts", postId);
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      const currentComments = Number(postDoc.data()?.commentsCount || 0);
      transaction.set(
        postRef,
        { commentsCount: currentComments + 1 },
        { merge: true },
      );
    });
  };

  const shareAchievement = async (input: ShareAchievementInput) => {
    if (!currentUid) {
      return;
    }

    const postRef = await addDoc(collection(db, "posts"), {
      authorId: currentUid,
      content: input.content.trim(),
      type: "achievement",
      achievement: {
        totalGrams: Number(input.totalGrams.toFixed(0)),
        entriesCount: input.entriesCount,
      },
      reactionsCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
    });

    const profile = usersById.get(currentUid);
    const initialComments = (input.initialComments || [])
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (initialComments.length > 0) {
      await Promise.all(
        initialComments.map((text) =>
          addDoc(collection(db, "posts", postRef.id, "comments"), {
            userId: currentUid,
            username: profile?.username || "Usuario",
            avatarUrl: profile?.avatarUrl || "",
            text,
            createdAt: serverTimestamp(),
          }),
        ),
      );

      await setDoc(
        doc(db, "posts", postRef.id),
        { commentsCount: initialComments.length },
        { merge: true },
      );
    }
  };

  const updateProfilePhoto = async (avatarUrl: string) => {
    if (!currentUid) {
      return;
    }

    console.info("[social][profile-photo] saving to firestore", {
      uid: currentUid,
      hasAvatarUrl: Boolean(avatarUrl),
      avatarUrlLength: avatarUrl.length,
    });

    await setDoc(
      doc(db, "users", currentUid),
      {
        avatarUrl,
      },
      { merge: true },
    );

    console.info("[social][profile-photo] saved to firestore", {
      uid: currentUid,
    });
  };

  return (
    <SocialContext.Provider
      value={{
        users,
        feedPosts: enrichedPosts,
        myPosts,
        followingFeedPosts,
        followingIds,
        followerEvents,
        currentProfile,
        loading,
        followUser,
        reactToPost,
        addComment,
        shareAchievement,
        updateProfilePhoto,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error("useSocial deve ser usado dentro de SocialProvider");
  }
  return context;
}
