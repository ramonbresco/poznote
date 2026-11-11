<!-- lang-selector -->
<p align="center">
  <a href="VSCODE-COPILOT.md">English</a> ·
  <a href="VSCODE-COPILOT.fr.md">Français</a> ·
  <a href="VSCODE-COPILOT.de.md">Deutsch</a> ·
  <a href="VSCODE-COPILOT.es.md">Español</a> ·
  <a href="VSCODE-COPILOT.pt.md">Português</a> ·
  <a href="VSCODE-COPILOT.ru.md">Русский</a> ·
  <a href="VSCODE-COPILOT.zh-cn.md">简体中文</a> ·
  <a href="VSCODE-COPILOT.ko.md">한국어</a> ·
  <a href="VSCODE-COPILOT.ja.md">日本語</a> ·
  <a href="VSCODE-COPILOT.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Sử dụng Poznote MCP Server với VS Code Copilot

Hướng dẫn này trình bày cách cấu hình và sử dụng Poznote MCP server với VS Code Copilot.

## Yêu cầu tiên quyết

- Đã cài đặt Visual Studio Code
- **Gói đăng ký GitHub Copilot:** Cần có gói [GitHub Copilot](https://github.com/features/copilot) trả phí (hoặc dùng thử), kèm tiện ích mở rộng Copilot Chat đã được bật trong VS Code
- Poznote MCP server đang chạy (qua Docker Compose)
- MCP server có thể truy cập trên 127.0.0.1 (cổng mặc định: 8045)

## Cấu hình

### 1. Kiểm tra MCP Server đang chạy

Kiểm tra xem container MCP server của bạn có đang chạy không:

```bash
docker ps | grep mcp
```

Bạn sẽ thấy MCP server đang chạy. Hãy ghi lại số cổng trong kết quả trả về (mặc định là 8045).

### 2. Cấu hình VS Code

Thêm Poznote MCP server vào tệp `mcp.json` của bạn. Vị trí tệp phụ thuộc vào hệ điều hành bạn sử dụng:

- **Windows:** `C:\Users\YOUR-USERNAME\AppData\Roaming\Code\User\mcp.json`
- **Linux:** `~/.config/Code/User/mcp.json`
- **macOS:** `~/Library/Application Support/Code/User/mcp.json`

Nếu tệp chưa tồn tại, hãy tạo mới với cấu hình sau:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    }
  }
}
```

> **Lưu ý:** Thay `8045` bằng cổng thực tế của MCP server nếu bạn đã tùy chỉnh trong tệp `docker-compose.yml`.

#### Sử dụng token xác thực

Nếu MCP server được khởi động cùng `POZNOTE_MCP_AUTH_TOKEN` (xem [Token xác thực đầu vào](MCP-SERVER.vi.md#token-xác-thực-đầu-vào)), hãy thêm header tương ứng; nếu không, mọi yêu cầu sẽ bị từ chối với lỗi `401 Unauthorized`:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

Để không phải lưu token trực tiếp trong `mcp.json`, bạn có thể cấu hình VS Code hỏi nhập token khi cần: khai báo một mục `inputs` với `"password": true` rồi tham chiếu bằng `"Authorization": "Bearer ${input:poznote-token}"`.

### 3. Tải lại VS Code

Sau khi cập nhật `mcp.json`, hãy tải lại VS Code để các thay đổi có hiệu lực:
- Nhấn `Ctrl+Shift+P` (hoặc `Cmd+Shift+P` trên Mac)
- Nhập "Reload Window" và nhấn Enter

## Thiết lập server từ xa

Nếu instance Poznote của bạn chạy trên một server từ xa, hãy dùng chuyển tiếp cổng qua SSH (SSH port forwarding) để kết nối an toàn.

### 1. Thiết lập SSH Tunnel

Nếu bạn thích dùng dòng lệnh, hãy tạo một SSH tunnel thông thường:

```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Giữ kết nối này luôn mở trong khi sử dụng VS Code Copilot với Poznote.

Nếu bạn đã kết nối sẵn tới máy từ xa thông qua VS Code Remote SSH, Dev Containers hoặc Codespaces, bạn cũng có thể tạo tunnel trực tiếp từ VS Code trong mục `PORTS`:

1. Mở bảng `PORTS` trong VS Code.
2. Chuyển tiếp cổng từ xa `8045`.
3. Giữ cổng đã chuyển tiếp luôn hoạt động trong khi dùng Copilot.
4. Nếu VS Code gán một cổng cục bộ khác `8045`, hãy dùng cổng cục bộ đó trong `mcp.json`.

### 2. Cấu hình VS Code

Sử dụng cấu hình `mcp.json` giống như khi cài đặt cục bộ:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    }
  }
}
```

SSH tunnel hoặc cổng được chuyển tiếp trong VS Code sẽ đưa MCP server từ xa về máy cục bộ của bạn, nhờ đó VS Code kết nối được tới `127.0.0.1`.

## Ví dụ sử dụng

Sau khi cấu hình xong, bạn có thể tương tác với instance Poznote của mình trực tiếp từ VS Code bằng ngôn ngữ tự nhiên trong Copilot Chat:

### Thao tác cơ bản

```
# Liệt kê tất cả ghi chú
@poznote Liệt kê tất cả ghi chú của tôi

# Tìm kiếm ghi chú
@poznote Tìm các ghi chú về "docker"

# Lấy một ghi chú cụ thể
@poznote Hiển thị ghi chú 123

# Liệt kê các workspace
@poznote Tôi có những workspace nào?

# Liệt kê các thư mục
@poznote Hiển thị tất cả thư mục trong workspace của tôi
```

### Tạo và cập nhật ghi chú

> **Workspace**: hãy nêu rõ tên workspace đích trong yêu cầu của bạn, ví dụ *"trong workspace 'Projets'"*. Nếu không có, server sẽ quay về dùng thiết lập `mcp_default_workspace`, hoặc workspace duy nhất của tài khoản, và sẽ từ chối yêu cầu nếu tài khoản có nhiều workspace mà thiết lập đó đang trống.

```
@poznote Tạo ghi chú có tiêu đề "Ghi chú cuộc họp" trong workspace "Projets" với nội dung về tính năng mới

@poznote Cập nhật ghi chú 456 với nội dung mới về quy trình triển khai

@poznote Xóa ghi chú 456 (chuyển vào thùng rác)

@poznote Tạo ghi chú "Gia hạn hộ chiếu" trong workspace "Perso" và nhắc tôi vào ngày 1 tháng 9 lúc 9 giờ sáng

@poznote Tạo một thư mục tên "Projects"
```

### Lời nhắc

```
@poznote Nhắc tôi về ghi chú 123 vào thứ Hai tuần tới lúc 8 giờ sáng

@poznote Đặt lời nhắc hằng tuần cho ghi chú 123, vào mỗi thứ Hai lúc 9 giờ sáng

@poznote Ghi chú 123 có lời nhắc nào không?

@poznote Gỡ lời nhắc khỏi ghi chú 123
```

### Danh sách công việc

```
@poznote Hiển thị các công việc của ghi chú 123

@poznote Thêm công việc "Mua sữa" hạn vào ngày mai lúc 18:30 kèm lời nhắc vào ghi chú 123

@poznote Thêm công việc "Báo cáo tuần" vào ghi chú 123, hạn vào mỗi thứ Sáu

@poznote Đánh dấu công việc "Mua sữa" trong ghi chú 123 là đã xong

@poznote Dời hạn hoàn thành của công việc "Mua sữa" trong ghi chú 123 sang thứ Hai tuần tới

@poznote Xóa công việc "Mua sữa" khỏi ghi chú 123
```

### Thao tác nâng cao

```
@poznote Nhân bản ghi chú 789

@poznote Đánh dấu ghi chú 123 là mục yêu thích

@poznote Di chuyển ghi chú 456 vào thư mục "Projects"

@poznote Chuyển đổi ghi chú 123 sang Markdown

@poznote Những ghi chú nào liên kết tới ghi chú 123?

@poznote Bật chia sẻ công khai cho ghi chú 123

@poznote Liệt kê tất cả ghi chú và thư mục đang được chia sẻ công khai của tôi

@poznote Tôi đang chạy Poznote phiên bản nào?
```

### Thư mục và Workspace

```
@poznote Đổi tên thư mục 12 thành "Archive"

@poznote Xóa thư mục 12 và chuyển các ghi chú trong đó vào thùng rác

@poznote Tạo một workspace tên "Work"

@poznote Đổi tên workspace "Work" thành "Job"

@poznote Xóa workspace "Job"
```

### Thùng rác và Khôi phục

```
@poznote Hiển thị tất cả ghi chú trong thùng rác

@poznote Khôi phục ghi chú 123 từ thùng rác

@poznote Dọn sạch thùng rác
```

### Đồng bộ Git

```
@poznote Trạng thái đồng bộ Git hiện như thế nào?

@poznote Đẩy các ghi chú của tôi lên Git

@poznote Kéo các ghi chú từ Git về
```

### Sao lưu và Cài đặt

```
@poznote Liệt kê tất cả bản sao lưu

@poznote Tạo một bản sao lưu dữ liệu của tôi

@poznote Khôi phục bản sao lưu poznote_backup_2026-02-02_15-30-00.zip

@poznote Xóa bản sao lưu poznote_backup_2026-02-02_15-30-00.zip

@poznote Thiết lập "timezone" đang là gì?

@poznote Đặt thiết lập "timezone" thành "Europe/Paris"
```

### Làm việc với nội dung

```
@poznote Bạn có thể tóm tắt tất cả ghi chú được gắn thẻ "important" của tôi không?

@poznote Giúp tôi sắp xếp các ghi chú vào các thư mục theo chủ đề của chúng

@poznote Tạo một báo cáo tuần dựa trên các ghi chú cuộc họp của tôi
```

## Khắc phục sự cố

### Lỗi kết nối

Nếu VS Code Copilot không thể kết nối tới MCP server:

1. **Kiểm tra xem MCP server có đang chạy không:**
   ```bash
   curl http://127.0.0.1:8045/mcp
   ```
   (Thay `8045` bằng cổng bạn đã cấu hình)

2. **Kiểm tra trạng thái Docker container:**
   ```bash
   docker ps | grep mcp
   docker compose logs mcp-server
   ```

3. **Kiểm tra ánh xạ cổng:**
   Đảm bảo cổng được bind vào 127.0.0.1 trong `docker-compose.yml`:
   ```yaml
   ports:
     - "127.0.0.1:${POZNOTE_MCP_PORT:-8045}:8045"
   ```

4. **Kiểm tra cú pháp mcp.json:**
   Đảm bảo tệp JSON của bạn hợp lệ (không có dấu phẩy thừa ở cuối, dùng đúng dấu ngoặc kép, v.v.)

### Không nhận diện được MCP Server

Nếu VS Code không nhận diện được Poznote MCP server:

1. Kiểm tra xem bạn đã tải lại VS Code sau khi sửa `mcp.json` chưa
2. Xác minh rằng GitHub Copilot đã được bật và đang hoạt động
3. Kiểm tra bảng Output của VS Code để xem thông báo lỗi (nếu có):
   - View → Output
   - Chọn "GitHub Copilot" từ danh sách thả xuống

### Lỗi xác thực

MCP server xác thực với Poznote bằng token dùng chung được lưu trong `data/.mcp_token`.

Kiểm tra các điểm sau:
- `./data/.mcp_token` có tồn tại trên máy host chạy Poznote
- service `mcp-server` có mount `./data:/var/www/html/data:ro`
- container webserver đã được tạo lại (recreate) ít nhất một lần sau khi cập nhật sang thiết lập MCP dùng token

### Chế độ gỡ lỗi (Debug Mode)

Bật ghi log gỡ lỗi cho MCP server bằng cách tạo lại container với biến môi trường nội tuyến:

```bash
POZNOTE_DEBUG=true docker compose up -d --force-recreate mcp-server
```

Chỉ các giá trị chữ thường chính xác là `true` và `false` mới được nhận diện. Mọi giá trị khác sẽ được xem như `false` và một cảnh báo sẽ được ghi vào log của MCP.

Sau đó kiểm tra log:
```bash
docker compose logs -f mcp-server
```

## Các công cụ MCP khả dụng

Server cung cấp các công cụ cho ghi chú, công việc (tasks), lời nhắc, thư mục, workspace, thẻ (tags), tệp đính kèm, bản sửa đổi (revisions), chia sẻ, đồng bộ Git và sao lưu. Toàn bộ danh sách từng công cụ cùng chức năng cụ thể được trình bày trong [tài liệu MCP server](MCP-SERVER.vi.md#tính-năng), đây là nơi duy nhất giữ danh sách này luôn được cập nhật.

### Hỗ trợ đa người dùng

Hầu hết các công cụ đều nhận một tham số `user_id` tùy chọn để nhắm tới hồ sơ người dùng cụ thể. Ngoại lệ là các công cụ cấp hệ thống `get_system_info`, `list_backups`, `create_backup` và `delete_backup`, vốn không nhận `user_id`. Bạn có thể chỉ định điều này trong prompt của mình:

```
@poznote Liệt kê ghi chú cho người dùng 2
```

## Cấu hình nâng cao

### Nhiều instance Poznote

Nếu bạn chạy nhiều instance Poznote, bạn có thể cấu hình chúng với những tên khác nhau:

```json
{
  "servers": {
    "poznote-personal": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    },
    "poznote-work": {
      "type": "http",
      "url": "http://127.0.0.1:9045/mcp"
    }
  }
}
```

Sau đó gọi trực tiếp từng instance khi cần:
```
@poznote-work Liệt kê các ghi chú công việc của tôi
```

### Cấu hình cổng tùy chỉnh

Nếu MCP server của bạn chạy trên một cổng khác, hãy cập nhật URL trong `mcp.json`:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:YOUR_PORT/mcp"
    }
  }
}
```

## Lưu ý bảo mật

⚠️ **Quan trọng:** Bất kỳ ai có thể truy cập endpoint MCP đều có thể quản lý mọi ghi chú. Mặc định endpoint này chỉ truy cập được từ 127.0.0.1; nếu bạn mở rộng phạm vi truy cập ra ngoài, hãy thiết lập `POZNOTE_MCP_AUTH_TOKEN` để các client bắt buộc phải gửi kèm bearer token (xem [Sử dụng token xác thực](#sử-dụng-token-xác-thực)).

**Cấu hình mặc định (an toàn):**
```yaml
ports:
  - "127.0.0.1:8045:8045"  # Only accessible from 127.0.0.1
```

**Để truy cập từ xa, hãy luôn dùng SSH tunnel** như được mô tả trong mục [Thiết lập server từ xa](#thiết-lập-server-từ-xa).

Xem chi tiết đầy đủ tại: [Bảo mật MCP Server](MCP-SERVER.vi.md#bảo-mật).

## Tài nguyên

- [Tài liệu chính về MCP Server](MCP-SERVER.vi.md)
- [Tài liệu chính thức về MCP trên VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Thiết lập Claude CLI](CLAUDE-CLI.vi.md)
- [Lưu ý về bảo mật](MCP-SERVER.vi.md#bảo-mật)

## Hỗ trợ

Nếu gặp sự cố hoặc có thắc mắc:
- Xem [tài liệu chính về MCP](MCP-SERVER.vi.md)
- Kiểm tra log của MCP server: `docker compose logs mcp-server`
- Xác minh rằng API Poznote có thể truy cập được
- Kiểm tra bảng Output của VS Code để xem lỗi
