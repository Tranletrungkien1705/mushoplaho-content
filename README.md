# mushoplaho-content — Video quảng cáo tự động (an toàn bản quyền)

GitHub Actions tạo **video slideshow** từ 3 ảnh branded của Mushoplaho (fade + nhạc tuỳ chọn) rồi **đăng lên Page Facebook** mỗi ngày ~10h sáng VN. **KHÔNG dùng video/nhạc bản quyền của người khác** → Page không bị gậy.

## Cần cấu hình 1 lần
- **Secret `FB_PAGE_POST_TOKEN`**: Settings → Secrets and variables → Actions → New secret. Giá trị = Page token có quyền `pages_manage_posts` (token vĩnh viễn).

## Nhạc nền (tuỳ chọn, phải FREE bản quyền)
- Bỏ 1 file **`assets/music.mp3`** (tải từ **Pixabay Music / Mixkit / Uppbeat** — miễn phí bản quyền) vào repo.
- Không có file → video vẫn chạy (không nhạc).

## Chạy
- Tự động: cron `0 3 * * *` (10h VN) — file `.github/workflows/daily-video.yml`.
- Chạy tay: tab **Actions → daily-video → Run workflow**.

## Tuỳ biến
- Đổi caption: sửa mảng `CAPS` trong workflow.
- Đổi ảnh nguồn: các URL `og.png/og2.png/og3.png` (worker tự phục vụ).
- Đổi thời lượng/hiệu ứng: sửa lệnh ffmpeg.
