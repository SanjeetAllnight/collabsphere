// Firebase Messaging Service Worker
// This file must be served from the public directory to be accessible at /firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase configuration (hardcoded since service workers can't access process.env)
firebase.initializeApp({
  apiKey: "AIzaSyBdNpjXs_g9gCub835Ve4bOcy8zBCgVXeU",
  authDomain: "collabsphere-9fb78.firebaseapp.com",
  projectId: "collabsphere-9fb78",
  storageBucket: "collabsphere-9fb78.firebasestorage.app",
  messagingSenderId: "587627144926",
  appId: "1:587627144926:web:4e5cebb3257dca4791c44f",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.tag || 'notification',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

