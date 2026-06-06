import { usePushNotifications } from "@/hooks/usePushNotifications";

interface UseExpoPushNotificationsOptions {
  enabled?: boolean;
}

export function useExpoPushNotifications(
  options: UseExpoPushNotificationsOptions = {},
) {
  const { fcmToken, notification } = usePushNotifications(options);

  return {
    expoPushToken: fcmToken,
    notification,
  };
}
