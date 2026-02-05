import { useEffect, useRef, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axiosClient from '@/utils/axios';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useExpoPushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        registerTokenInBackend(token);
      }
    });

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación recibida:', notification);
      setNotification(notification);
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Usuario tocó la notificación:', response);
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  // Deshabilitar notificaciones en web (requiere configuración VAPID)
  if (Platform.OS === 'web') {
    console.log('⚠️ Push notifications no disponibles en web');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permisos de notificación denegados');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log('✅ Expo Push Token:', token);
  } else {
    console.log('⚠️ Debe usar un dispositivo físico para push notifications');
  }

  return token;
}

async function registerTokenInBackend(token: string) {
  try {
    const deviceInfo = {
      token,
      device_type: Platform.OS,
      device_name: Device.deviceName || 'Unknown',
      app_version: Constants.expoConfig?.version || '1.0.0',
    };

    await axiosClient.post('/auth/admin/device-tokens/register', deviceInfo);
    console.log('✅ Token registrado en el backend');
  } catch (error) {
    console.error('❌ Error al registrar token:', error);
  }
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  
  // Manejar navegación según el tipo de notificación
  if (data.type === 'reminder_assigned') {
    console.log('Navegar a recordatorio:', data.reminder_id);
    // TODO: Agregar navegación al detalle del recordatorio
  }
}
