import React, { useEffect, useState, useCallback } from "react"
import "./App.css"

const VAPID_PUBLIC_KEY =
  "BJY3LDeIoKdPkDrTq1eTko4iKIiPkoOsFa7rSylpeYg-ctuHMgR2rpg3dQFwvP7CRpLq-rWW1z7z-7rZUrWCsVI"

const API_URL = "https://pwa-server-s9i9.onrender.com"

function App() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribeButtonDisabled, setSubscribeButtonDisabled] = useState(true)
  const [unsubscribeButtonDisabled, setUnsubscribeButtonDisabled] =
    useState(true)
  const [notificationCount, setNotificationCount] = useState(0)

  const updateNotificationCount = useCallback(() => {
    setNotificationCount((prevCount) => {
      const newCount = prevCount + 1
      console.log("Updating notification count to:", newCount) // Logging the count
      setAppBadge(newCount)
      return newCount
    })
  }, [])

  const resetNotificationCount = useCallback(() => {
    console.log("Resetting notification count") // Logging reset action
    setNotificationCount(0)
    clearAppBadge()
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "resetNotificationCount",
      })
    }
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((serviceWorkerRegistration) => {
          console.info(
            "Service worker was registered.",
            serviceWorkerRegistration
          )
          setSubscribeButtonDisabled(false)
        })
        .catch((error) => {
          console.error(
            "An error occurred while registering the service worker.",
            error
          )
        })

      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          setIsSubscribed(true)
          setUnsubscribeButtonDisabled(false)
        }

        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("Message received from service worker:", event)
          if (event.data.notificationCount !== undefined) {
            console.log(
              "Setting notification count from message:",
              event.data.notificationCount
            )
            setNotificationCount(event.data.notificationCount)
            setAppBadge(event.data.notificationCount)
          } else {
            updateNotificationCount()
          }
        })
      })

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          resetNotificationCount()
        }
      })
    } else {
      console.error(
        "Browser does not support service workers or push messages."
      )
    }
  }, [updateNotificationCount, resetNotificationCount])

  const urlB64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)

    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeButtonHandler = async () => {
    setSubscribeButtonDisabled(true)
    const result = await Notification.requestPermission()
    if (result === "denied") {
      console.error("The user explicitly denied the permission request.")
      setSubscribeButtonDisabled(false)
      return
    }
    if (result === "granted") {
      console.info("The user accepted the permission request.")
    }
    const registration = await navigator.serviceWorker.getRegistration()
    const subscribed = await registration.pushManager.getSubscription()
    if (subscribed) {
      console.info("User is already subscribed.")
      setUnsubscribeButtonDisabled(false)
      return
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    setUnsubscribeButtonDisabled(false)
    fetch(`${API_URL}/add-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    })
    setIsSubscribed(true)
  }

  const unsubscribeButtonHandler = async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      console.info("No subscription found.")
      return
    }
    fetch(`${API_URL}/remove-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    const unsubscribed = await subscription.unsubscribe()
    if (unsubscribed) {
      console.info("Successfully unsubscribed from push notifications.")
      setUnsubscribeButtonDisabled(true)
      setSubscribeButtonDisabled(false)
      setIsSubscribed(false)
      clearAppBadge()
    } else {
      console.error("Failed to unsubscribe from push notifications.")
    }
  }

  const setAppBadge = (count) => {
    if (navigator.setAppBadge) {
      navigator.setAppBadge(count).catch((error) => {
        console.error("Failed to set app badge:", error)
      })
    } else {
      console.warn("setAppBadge is not supported in this browser")
    }
  }

  const clearAppBadge = () => {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch((error) => {
        console.error("Failed to clear app badge:", error)
      })
    } else {
      console.warn("clearAppBadge is not supported in this browser")
    }
  }

  return (
    <div className="App">
      <button
        id="subscribe"
        onClick={subscribeButtonHandler}
        disabled={subscribeButtonDisabled}
      >
        Subscribe
      </button>

      <button
        id="unsubscribe"
        onClick={unsubscribeButtonHandler}
        disabled={unsubscribeButtonDisabled}
      >
        Unsubscribe
      </button>
      <p id="notification-status-message"></p>
      {notificationCount > 0 && (
        <div className="notification-badge">{notificationCount}</div>
      )}
    </div>
  )
}

export default App
