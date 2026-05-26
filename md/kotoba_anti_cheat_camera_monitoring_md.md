# Kotoba - Anti Cheat Camera Monitoring Research

# 1. Tổng quan

Tài liệu này mô tả hướng triển khai chức năng anti-cheat monitoring cho dự án Kotoba.

Mục tiêu:

- Detect hành vi gian lận khi thi speaking
- Hoạt động trên Chrome/Safari mobile browser
- Không cần cài app native
- Chạy trực tiếp trên web bằng Next.js

---

# 2. Các hành vi có thể detect

| Hành vi | Detect được |
|---|---|
| Không có mặt | YES |
| Nhiều khuôn mặt | YES |
| Quay mặt sang trái/phải | YES |
| Cúi đầu nhìn xuống | YES |
| Nhìn lệch khỏi màn hình quá lâu | YES |
| Chuyển tab | YES |
| Minimize browser | YES |
| Mất focus browser | YES |
| Eye tracking chính xác tuyệt đối | NO |

---

# 3. Recommendation cho MVP

NÊN detect:

- face missing
- multiple faces
- looking away
- head down
- browser hidden
- tab switching

KHÔNG nên:

- auto disqualify bằng AI
- rely 100% vào eye tracking

---

# 4. Kiến trúc tổng quan

```txt
Next.js Client
    ↓
getUserMedia()
    ↓
Camera Stream
    ↓
MediaPipe Face Detection
    ↓
Violation Detection
    ↓
Save Violation Logs
    ↓
Upload Audio/Video
```

---

# 5. Browser APIs cần dùng

| API | Purpose |
|---|---|
| getUserMedia | mở camera/micro |
| MediaRecorder | record audio/video |
| Page Visibility API | detect tab switching |
| Fullscreen API | focus mode |
| AudioContext | audio processing |

---

# 6. Camera Access

## Example

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});
```

---

# 7. MediaRecorder

## Dùng để:

- record audio answer
- record monitoring video
- upload evidence

## Example

```ts
const recorder = new MediaRecorder(stream);
recorder.start();
```

---

# 8. Face Detection Recommendation

## Recommendation

Sử dụng:

```txt
MediaPipe Face Landmarker
```

Ưu điểm:

- chạy trực tiếp trên browser
- không cần AI server-side
- hỗ trợ mobile browser
- performance tốt
- không tốn AI cost

---

# 9. Các detect chính

## Face Missing

Nếu:

```txt
Không detect được face > X giây
```

=> suspicious

---

## Multiple Faces

Nếu:

```txt
Detect > 1 face
```

=> high risk

---

## Looking Away

Detect:

- head yaw
- head pitch
- face direction

Ví dụ:

```txt
Nhìn lệch > 5 giây
```

=> warning

---

## Head Down

Detect:

```txt
pitch angle xuống thấp
```

=> suspicious

---

# 10. Tab Switching Detection

## Example

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // switched tab
  }
});
```

---

# 11. Browser Blur Detection

## Example

```ts
window.addEventListener("blur", () => {
  // browser lost focus
});
```

---

# 12. Suggested Violation Log Structure

```json
{
  "type": "LOOK_AWAY",
  "severity": "warning",
  "durationMs": 5200,
  "timestamp": "2026-05-18T08:20:00Z"
}
```

---

# 13. Severity Recommendation

| Severity | Meaning |
|---|---|
| INFO | normal behavior |
| WARNING | suspicious |
| HIGH_RISK | likely cheating |

---

# 14. Recommendation cho exam system

KHÔNG nên:

- auto fail user ngay lập tức
- disqualify chỉ bằng AI

Nên:

- log violations
- save snapshots
- human review

---

# 15. Snapshot Recommendation

## Recommendation

Chỉ capture:

- khi có violation
- theo interval lớn

Ví dụ:

```txt
5-10 giây / snapshot
```

---

# 16. Video Recording Recommendation

## MVP

KHÔNG cần:

- upload full monitoring video

NÊN:

- log violations
- save snapshots
- chỉ record audio answer

---

# 17. Cost Analysis

## Nếu chạy browser-side

| Feature | Cost |
|---|---|
| MediaPipe | FREE |
| getUserMedia | FREE |
| MediaRecorder | FREE |
| Browser APIs | FREE |

---

# 18. Chi phí phát sinh ở đâu?

| Item | Cost |
|---|---|
| S3 Storage | YES |
| CDN Bandwidth | YES |
| Upload video | YES |
| Server-side AI video analysis | HIGH |

---

# 19. Recommendation Cost Optimization

KHÔNG nên:

- upload toàn bộ video 15 phút
- analyze video bằng AI server-side realtime

NÊN:

- browser-side detection
- upload snapshots nhỏ
- upload audio answers

---

# 20. Suggested Tech Stack

## Frontend

- Next.js 15
- React
- MediaRecorder API
- MediaPipe Face Landmarker
- TailwindCSS

---

## Backend

- NestJS
- S3 Storage
- BullMQ
- Redis

---

# 21. Mobile Browser Support

| Platform | Browser |
|---|---|
| Android | Chrome |
| iOS | Safari |

---

# 22. Fullscreen Recommendation

Recommendation:

```txt
Enable fullscreen mode during exam
```

Purpose:

- reduce distractions
- improve anti-cheat monitoring

---

# 23. Suggested Anti-Cheat Rules

| Rule | Action |
|---|---|
| Face missing > 3s | Warning |
| Face missing > 10s | High Risk |
| Multiple faces | High Risk |
| Tab switch | Warning |
| Browser blur | Warning |
| Looking away > 5s | Warning |

---

# 24. Recommendation cho Reviewer Dashboard

Reviewer nên thấy:

- violation timeline
- snapshots
- tab switching logs
- face missing logs
- audio playback

---

# 25. Important Limitation

Browser-based anti-cheat:

- không chính xác 100%
- phụ thuộc camera quality
- phụ thuộc ánh sáng
- không thay thế human proctoring

---

# 26. Final Recommendation

## MVP Strategy

### MUST HAVE

- camera required
- face detection
- tab switching detection
- browser blur detection
- violation logs
- snapshots

### NICE TO HAVE

- gaze estimation
- advanced head tracking
- realtime reviewer monitoring
- server-side video AI

---

# 27. Final Conclusion

Anti-cheat monitoring cho Kotoba hoàn toàn có thể build bằng:

- Next.js
- Browser APIs
- MediaPipe

mà không cần:

- native app
- expensive AI video services
- realtime server-side video analysis

MVP có thể triển khai với chi phí rất thấp nếu detect trực tiếp trên browser.

