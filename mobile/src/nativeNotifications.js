import { Platform } from "react-native";

let notificationsPromise;

async function getNotifications() {
  if (Platform.OS === "web") return null;

  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications")
      .then((module) => {
        module.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowAlert: true,
          }),
        });
        return module;
      })
      .catch(() => null);
  }

  return notificationsPromise;
}

async function requestNotificationPermissions() {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function sendWelcomeNotification(email) {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      body: `Logged in as ${email}`,
      title: "Welcome to VSU Trojan Fitness",
    },
    trigger: null,
  });

  return true;
}
