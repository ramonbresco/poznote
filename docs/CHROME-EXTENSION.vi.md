<!-- lang-selector -->
<p align="center">
  <a href="CHROME-EXTENSION.md">English</a> ·
  <a href="CHROME-EXTENSION.fr.md">Français</a> ·
  <a href="CHROME-EXTENSION.de.md">Deutsch</a> ·
  <a href="CHROME-EXTENSION.es.md">Español</a> ·
  <a href="CHROME-EXTENSION.pt.md">Português</a> ·
  <a href="CHROME-EXTENSION.ru.md">Русский</a> ·
  <a href="CHROME-EXTENSION.zh-cn.md">简体中文</a> ·
  <a href="CHROME-EXTENSION.ko.md">한국어</a> ·
  <a href="CHROME-EXTENSION.ja.md">日本語</a> ·
  <a href="CHROME-EXTENSION.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Tiện ích mở rộng Poznote trên Chrome

**Poznote URL Saver** là tiện ích mở rộng trình duyệt giúp lưu trang web hiện tại vào instance Poznote của bạn chỉ bằng một cú nhấp chuột: lưu địa chỉ trang, hoặc địa chỉ kèm ảnh chụp màn hình, dưới dạng ghi chú mới hoặc nối vào cuối một ghi chú đã có.

<p align="center">
  <img src="../images/chrome-extension.png" alt="Tiện ích mở rộng Poznote trên Chrome" width="50%">
</p>

Cài đặt trực tiếp tiện ích từ Chrome Web Store: [Cài đặt tiện ích](https://chromewebstore.google.com/detail/bmjclfamahegmgillaghhmnbkjebipbh?utm_source=item-share-cb)

## Kết nối với instance của bạn

1. Trong Poznote, mở **Settings > App passwords**, tạo một mật khẩu ứng dụng đặt tên theo tiện ích, rồi sao chép chuỗi secret hiển thị. Chuỗi này chỉ hiện một lần duy nhất.
2. Nhấp vào biểu tượng của tiện ích, sau đó chọn **Connect**. Trang cài đặt của tiện ích sẽ mở ra trong một tab mới.
3. Điền **Poznote address** (ví dụ: `https://notes.example.com`), **Username** và **App password** bạn vừa sao chép, sau đó nhấp **Connect** và cho phép tiện ích truy cập tới instance của bạn khi Chrome hỏi quyền.
4. Chọn **Workspace**, và tùy chọn **Folder**, nơi các ghi chú mới sẽ được lưu. Lựa chọn được lưu ngay khi bạn chọn.

Để thay đổi các thiết lập này sau đó, hãy nhấp vào biểu tượng bánh răng ở phía trên tiện ích.

Địa chỉ instance hiển thị bên cạnh cũng là một liên kết: nhấp vào đó để mở Poznote trong tab mới, qua giao thức http hoặc https đúng như bạn đã nhập trong cài đặt.

Tiện ích sử dụng ngôn ngữ của Chrome nếu đó là tiếng Anh, tiếng Pháp, tiếng Đức, tiếng Tây Ban Nha, tiếng Bồ Đào Nha, tiếng Nga, tiếng Hàn, tiếng Trung giản thể, tiếng Nhật hoặc tiếng Catalan, và mặc định dùng tiếng Anh cho các ngôn ngữ khác.

Mật khẩu tài khoản của bạn cũng dùng được tại đây, nhưng mật khẩu ứng dụng (app password) là lựa chọn an toàn hơn cho tiện ích: nó chỉ gọi được API, không bao giờ mở được giao diện web hay cài đặt tài khoản, chỉ giới hạn trong hồ sơ của riêng bạn, và việc thu hồi mật khẩu này trong Poznote sẽ ngắt kết nối tiện ích ngay mà không ảnh hưởng tới phần còn lại. Xem [Mật khẩu ứng dụng](README.vi.md#mật-khẩu-ứng-dụng) để biết danh sách đầy đủ các giới hạn.

> **Nếu instance của bạn chỉ dùng SSO,** mật khẩu ứng dụng là cách duy nhất để kết nối tiện ích: biểu mẫu đăng nhập mà tiện ích cần không tồn tại cho tài khoản của bạn. Hãy tạo một mật khẩu trong **Settings > App passwords** đúng như hướng dẫn ở trên.

## Lưu một trang

Nhấp vào biểu tượng tiện ích trên trang bạn muốn lưu, rồi chọn nơi lưu:

- **New note** tạo một ghi chú mới đặt tên theo tiêu đề trang, trong workspace và thư mục đã chọn trong cài đặt.
- **Existing note** chèn trang vào cuối một ghi chú bạn chọn từ danh sách; danh sách này hiển thị các ghi chú mới nhất và lọc tìm ngay khi bạn gõ. Mặc định danh sách hiển thị các ghi chú trong workspace đã chọn ở cài đặt; bật **All workspaces** để chọn ghi chú ở bất kỳ đâu. Tiện ích ghi nhớ ghi chú đó cho lần lưu tiếp theo, giúp việc gom liên kết vào một danh sách đọc chỉ mất một cú nhấp cho mỗi trang. Cả ghi chú HTML và Markdown đều có thể nhận trang lưu.

Sau đó nhấp **Save link** để lưu địa chỉ trang, hoặc **Screenshot** để lưu địa chỉ kèm ảnh chụp phần đang hiển thị của trang. Thông báo xác nhận có kèm liên kết để mở ngay ghi chú đó trong Poznote.
