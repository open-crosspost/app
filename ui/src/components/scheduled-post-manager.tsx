import type React from "react";
import { useEffect } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useScheduledPostExecutor } from '@/hooks/use-scheduled-post-executor';

/**
 * This component runs in the background to automatically execute scheduled posts
 * It should be included in the main app layout when user is signed in
 */
export const ScheduledPostManager: React.FC = () => {
  const { isSignedIn } = useAuth();
  const { checkAndExecutePendingPosts } = useScheduledPostExecutor();

  useEffect(() => {
    if (isSignedIn) {
      // Initial check when component mounts and user is signed in
      checkAndExecutePendingPosts();
    }
  }, [isSignedIn, checkAndExecutePendingPosts]);

  // This component doesn't render anything visible
  return null;
};
