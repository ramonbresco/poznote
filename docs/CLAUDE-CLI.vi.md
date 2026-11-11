<!-- lang-selector -->
<p align="center">
  <a href="CLAUDE-CLI.md">English</a> ·
  <a href="CLAUDE-CLI.fr.md">Français</a> ·
  <a href="CLAUDE-CLI.de.md">Deutsch</a> ·
  <a href="CLAUDE-CLI.es.md">Español</a> ·
  <a href="CLAUDE-CLI.pt.md">Português</a> ·
  <a href="CLAUDE-CLI.ru.md">Русский</a> ·
  <a href="CLAUDE-CLI.zh-cn.md">简体中文</a> ·
  <a href="CLAUDE-CLI.ko.md">한국어</a> ·
  <a href="CLAUDE-CLI.ja.md">日本語</a> ·
  <a href="CLAUDE-CLI.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Sử dụng Poznote MCP Server với Claude CLI

Hướng dẫn này trình bày cách cấu hình và sử dụng Poznote MCP server với Claude CLI (Command Line Interface).

## Yêu cầu tiên quyết

- **Tài khoản Anthropic:** Claude CLI đăng nhập bằng gói đăng ký Claude, hoặc bằng [Anthropic API key](https://console.anthropic.com/). Nếu dùng API key, hãy thiết lập biến môi trường này trước khi sử dụng CLI:
  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...
  ```
- Đã cài đặt Claude CLI (`npm install -g @anthropic-ai/claude-code`)
- Poznote MCP server đang chạy (qua Docker Compose)
- MCP server có thể truy cập trên 127.0.0.1 (cổng mặc định: 8045)

## Cài đặt

### 1. Kiểm tra MCP Server đang chạy

Kiểm tra xem container MCP server của bạn có đang chạy không:

```bash
docker ps | grep mcp
```

Bạn sẽ thấy MCP server đang chạy. Hãy ghi lại số cổng trong kết quả trả về (mặc định là 8045).

### 2. Thêm MCP Server vào Claude CLI

Thêm Poznote MCP server bằng giao thức truyền tải HTTP:

```bash
claude mcp add --transport http poznote http://127.0.0.1:8045/mcp
```

> **Lưu ý:** Thay `8045` bằng cổng thực tế của MCP server nếu bạn đã tùy chỉnh trong tệp `docker-compose.yml`.

#### Sử dụng token xác thực

Nếu MCP server được khởi động cùng `POZNOTE_MCP_AUTH_TOKEN` (xem [Token xác thực đầu vào](MCP-SERVER.vi.md#token-xác-thực-đầu-vào)), hãy truyền cùng token đó dưới dạng header; nếu không, mọi yêu cầu sẽ bị từ chối với lỗi `401 Unauthorized`:

```bash
claude mcp add --transport http poznote http://127.0.0.1:8045/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

Vị trí lưu cấu hình phụ thuộc vào tùy chọn `--scope`:
- **Local (mặc định):** `~/.claude.json`, chỉ khả dụng trong thư mục nơi bạn chạy lệnh
- **User (`--scope user`):** `~/.claude.json`, khả dụng trong mọi dự án của bạn
- **Project (`--scope project`):** `.mcp.json` tại thư mục gốc của dự án, dùng để commit và chia sẻ với nhóm của bạn

### 3. Kiểm tra cấu hình

Liệt kê tất cả các MCP server đã cấu hình:
```bash
claude mcp list
```

Bạn sẽ thấy `poznote` trong danh sách kèm theo URL HTTP của nó.

### 4. Xem chi tiết server

Xem thông tin chi tiết về Poznote MCP server:
```bash
claude mcp get poznote
```

## Ví dụ sử dụng

Sau khi cấu hình xong, bạn có thể tương tác với instance Poznote của mình bằng các câu lệnh ngôn ngữ tự nhiên:

### Truy vấn cơ bản

```bash
# Liệt kê tất cả ghi chú
claude "Liệt kê tất cả ghi chú của tôi từ Poznote"

# Tìm kiếm ghi chú
claude "Tìm các ghi chú về 'docker' trong Poznote"

# Lấy một ghi chú cụ thể
claude "Hiển thị ghi chú 123 từ Poznote"

# Liệt kê các workspace
claude "Tôi có những workspace nào trong Poznote?"

# Liệt kê các thư mục
claude "Hiển thị tất cả thư mục trong workspace Poznote của tôi"
```

### Tạo và cập nhật ghi chú

```bash
# Tạo ghi chú mới
# QUAN TRỌNG: luôn nêu rõ tên workspace đích. Nếu không có, server sẽ dùng
# thiết lập mcp_default_workspace, hoặc workspace duy nhất của tài khoản, và sẽ
# từ chối yêu cầu nếu tài khoản có nhiều workspace mà thiết lập đó đang trống.
claude "Tạo một ghi chú trong Poznote có tiêu đề 'Ghi chú cuộc họp' trong workspace 'Projets' với nội dung 'Thảo luận về tính năng mới'"

# Cập nhật ghi chú đã có
claude "Cập nhật ghi chú 456 trong Poznote với nội dung mới về quy trình triển khai"

# Xóa ghi chú (chuyển vào thùng rác)
claude "Xóa ghi chú 456 trong Poznote"

# Tạo ghi chú kèm lời nhắc trong một bước
claude "Tạo ghi chú 'Gia hạn hộ chiếu' trong workspace 'Perso' trên Poznote và nhắc tôi vào ngày 1 tháng 9 lúc 9 giờ sáng"

# Tạo thư mục
claude "Tạo một thư mục tên 'Projects' trong Poznote"
```

### Lời nhắc

```bash
# Đặt lời nhắc cho ghi chú đã có
claude "Nhắc tôi về ghi chú 123 trong Poznote vào thứ Hai tuần tới lúc 8 giờ sáng"

# Đặt lời nhắc lặp lại
claude "Đặt lời nhắc hằng tuần cho ghi chú 123 trong Poznote, vào mỗi thứ Hai lúc 9 giờ sáng"

# Kiểm tra lời nhắc
claude "Ghi chú 123 trong Poznote có lời nhắc nào không?"

# Gỡ lời nhắc
claude "Gỡ lời nhắc khỏi ghi chú 123 trong Poznote"
```

### Danh sách công việc

```bash
# Liệt kê các công việc trong một ghi chú danh sách công việc
claude "Hiển thị các công việc của ghi chú 123 trong Poznote"

# Thêm công việc kèm hạn hoàn thành và lời nhắc
claude "Thêm công việc 'Mua sữa' hạn vào ngày mai lúc 18:30 kèm lời nhắc vào ghi chú 123 trong Poznote"

# Thêm công việc lặp lại
claude "Thêm công việc 'Báo cáo tuần' vào ghi chú 123 trong Poznote, hạn vào mỗi thứ Sáu"

# Đánh dấu hoàn thành công việc
claude "Đánh dấu công việc 'Mua sữa' trong ghi chú 123 là đã xong trên Poznote"

# Cập nhật hoặc xóa công việc
claude "Dời hạn hoàn thành của công việc 'Mua sữa' trong ghi chú 123 sang thứ Hai tuần tới trên Poznote"
claude "Xóa công việc 'Mua sữa' khỏi ghi chú 123 trong Poznote"
```

### Thao tác nâng cao

```bash
# Nhân bản ghi chú
claude "Nhân bản ghi chú 789 trong Poznote"

# Bật/tắt mục yêu thích
claude "Đánh dấu ghi chú 123 là mục yêu thích trong Poznote"

# Di chuyển ghi chú vào thư mục
claude "Di chuyển ghi chú 456 vào thư mục 'Projects' trong Poznote"

# Chuyển đổi ghi chú giữa HTML và Markdown
claude "Chuyển đổi ghi chú 123 trong Poznote sang Markdown"

# Tìm các ghi chú liên kết tới một ghi chú
claude "Những ghi chú nào liên kết tới ghi chú 123 trong Poznote?"

# Chia sẻ ghi chú
claude "Bật chia sẻ công khai cho ghi chú 123 trong Poznote"

# Liệt kê mọi thứ đang được chia sẻ công khai
claude "Liệt kê tất cả ghi chú và thư mục đang được chia sẻ công khai của tôi trong Poznote"

# Lấy thông tin hệ thống
claude "Tôi đang chạy Poznote phiên bản nào?"
```

### Thư mục và Workspace

```bash
# Đổi tên hoặc xóa thư mục
claude "Đổi tên thư mục 12 thành 'Archive' trong Poznote"
claude "Xóa thư mục 12 trong Poznote và chuyển các ghi chú trong đó vào thùng rác"

# Quản lý workspace
claude "Tạo một workspace tên 'Work' trong Poznote"
claude "Đổi tên workspace 'Work' thành 'Job' trong Poznote"
claude "Xóa workspace 'Job' trong Poznote"
```

### Cài đặt

```bash
# Đọc một thiết lập
claude "Thiết lập 'timezone' trong Poznote đang là gì?"

# Cập nhật một thiết lập
claude "Đặt thiết lập 'timezone' thành 'Europe/Paris' trong Poznote"
```

### Thùng rác và Khôi phục

```bash
# Xem thùng rác
claude "Hiển thị tất cả ghi chú trong thùng rác Poznote"

# Khôi phục ghi chú
claude "Khôi phục ghi chú 123 từ thùng rác Poznote"

# Dọn sạch thùng rác
claude "Dọn sạch thùng rác Poznote"
```

### Đồng bộ Git

```bash
# Kiểm tra trạng thái đồng bộ Git
claude "Trạng thái đồng bộ Git trong Poznote hiện như thế nào?"

# Đẩy lên Git
claude "Đẩy các ghi chú Poznote của tôi lên Git"

# Kéo về từ Git
claude "Kéo các ghi chú từ Git về Poznote"
```

### Sao lưu

```bash
# Liệt kê các bản sao lưu
claude "Liệt kê tất cả bản sao lưu Poznote"

# Tạo bản sao lưu
claude "Tạo một bản sao lưu dữ liệu Poznote của tôi"

# Khôi phục bản sao lưu (⚠️ thay thế toàn bộ dữ liệu người dùng hiện tại)
claude "Khôi phục bản sao lưu Poznote poznote_backup_2026-02-02_15-30-00.zip"

# Xóa tệp sao lưu
claude "Xóa bản sao lưu Poznote poznote_backup_2026-02-02_15-30-00.zip"
```

## Chế độ tương tác

Bắt đầu một phiên tương tác để trò chuyện trực tiếp với Claude về các ghi chú của bạn:

```bash
claude
```

Sau đó đặt câu hỏi một cách tự nhiên:
- "Bạn có thể hiển thị tất cả ghi chú được gắn thẻ 'important' của tôi không?"
- "Tạo bản tóm tắt tất cả ghi chú cuộc họp của tôi từ tuần trước"
- "Giúp tôi sắp xếp các ghi chú vào các thư mục"

## Tùy chọn cấu hình

### Sử dụng cổng tùy chỉnh

Nếu MCP server của bạn chạy trên một cổng khác (kiểm tra thiết lập `POZNOTE_MCP_PORT` trong tệp `docker-compose.yml`):
```bash
claude mcp add --transport http poznote http://127.0.0.1:YOUR_PORT/mcp
```

### Gỡ bỏ server

Để gỡ Poznote MCP server khỏi Claude CLI:
```bash
claude mcp remove poznote
```

### Nhiều instance

Nếu bạn chạy nhiều instance Poznote trên các cổng khác nhau, bạn có thể cấu hình chúng với những tên khác nhau:
```bash
claude mcp add --transport http poznote-personal http://127.0.0.1:8045/mcp
claude mcp add --transport http poznote-work http://127.0.0.1:9045/mcp
```

Sau đó chỉ rõ instance cần dùng trong các truy vấn của bạn:
```bash
claude "Liệt kê các ghi chú từ poznote-work"
```

## Khắc phục sự cố

### Lỗi kết nối

Nếu Claude CLI không thể kết nối tới MCP server:

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

## Lưu ý bảo mật

⚠️ **Quan trọng:** Bất kỳ ai có thể truy cập endpoint MCP đều có thể quản lý mọi ghi chú. Mặc định endpoint này chỉ truy cập được từ 127.0.0.1; nếu bạn mở rộng phạm vi truy cập ra ngoài, hãy thiết lập `POZNOTE_MCP_AUTH_TOKEN` để các client bắt buộc phải gửi kèm bearer token (xem [Sử dụng token xác thực](#sử-dụng-token-xác-thực)).

**Cấu hình mặc định (an toàn):**
```yaml
ports:
  - "127.0.0.1:8045:8045"  # Only accessible from 127.0.0.1
```

**Để truy cập từ xa, hãy dùng SSH tunnel:**
```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Xem chi tiết đầy đủ tại: [Bảo mật MCP Server](MCP-SERVER.vi.md#bảo-mật).

## Các công cụ MCP khả dụng

Server cung cấp các công cụ cho ghi chú, công việc (tasks), lời nhắc, thư mục, workspace, thẻ (tags), tệp đính kèm, bản sửa đổi (revisions), chia sẻ, đồng bộ Git và sao lưu. Toàn bộ danh sách từng công cụ cùng chức năng cụ thể được trình bày trong [tài liệu MCP server](MCP-SERVER.vi.md#tính-năng), đây là nơi duy nhất giữ danh sách này luôn được cập nhật.

### Hỗ trợ đa người dùng

Hầu hết các công cụ đều nhận một tham số `user_id` tùy chọn để nhắm tới hồ sơ người dùng cụ thể. Ngoại lệ là các công cụ cấp hệ thống `get_system_info`, `list_backups`, `create_backup` và `delete_backup`, vốn không nhận `user_id`.
```bash
claude "Liệt kê ghi chú cho người dùng 2 trong Poznote"
```

## Tài liệu liên quan

- [Tài liệu chính về MCP Server](MCP-SERVER.vi.md)
- [Thiết lập VS Code Copilot](VSCODE-COPILOT.vi.md)
- [Lưu ý về bảo mật](MCP-SERVER.vi.md#bảo-mật)

## Hỗ trợ

Nếu gặp sự cố hoặc có thắc mắc:
- Xem [tài liệu chính về MCP](MCP-SERVER.vi.md)
- Kiểm tra log của MCP server: `docker compose logs mcp-server`
- Xác minh rằng API Poznote có thể truy cập được
