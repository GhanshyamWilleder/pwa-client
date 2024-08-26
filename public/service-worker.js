self.addEventListener("push", function (event) {
  console.log("Push received" + event.data.text())
  const notification = event.data.json()

  event.waitUntil(
    self.registration.showNotification(notification.title, notification.option)
  )

  // Update notification count
  event.waitUntil(updateNotificationCount())
})

self.addEventListener("notificationclick", function (event) {
  console.log("On notification click: ", event.notification.tag)

  event.notification.close()
  event.waitUntil(self.clients.openWindow("https://web.dev"))
})

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "resetNotificationCount") {
    event.waitUntil(resetNotificationCount())
  }
})

async function updateNotificationCount() {
  console.log("Updating notification count")
  const count = await getNotificationCount()
  const newCount = count + 1
  await setNotificationCount(newCount)

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ notificationCount: newCount })
    })
  })
}

async function resetNotificationCount() {
  console.log("Resetting notification count")
  await setNotificationCount(0)

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ notificationCount: 0 })
    })
  })
}

function getNotificationCount() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("notificationDB", 1)

    request.onupgradeneeded = function (event) {
      const db = event.target.result
      db.createObjectStore("notificationStore", { keyPath: "id" })
    }

    request.onsuccess = function (event) {
      const db = event.target.result
      const transaction = db.transaction("notificationStore", "readonly")
      const store = transaction.objectStore("notificationStore")
      const getRequest = store.get(1)

      getRequest.onsuccess = function (event) {
        const result = event.target.result
        resolve(result ? result.count : 0)
      }

      getRequest.onerror = function () {
        reject(0)
      }
    }

    request.onerror = function () {
      reject(0)
    }
  })
}

function setNotificationCount(count) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("notificationDB", 1)

    request.onupgradeneeded = function (event) {
      const db = event.target.result
      db.createObjectStore("notificationStore", { keyPath: "id" })
    }

    request.onsuccess = function (event) {
      const db = event.target.result
      const transaction = db.transaction("notificationStore", "readwrite")
      const store = transaction.objectStore("notificationStore")
      const putRequest = store.put({ id: 1, count: count })

      putRequest.onsuccess = function () {
        resolve()
      }

      putRequest.onerror = function () {
        reject()
      }
    }

    request.onerror = function () {
      reject()
    }
  })
}
