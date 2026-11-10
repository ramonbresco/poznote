<!-- lang-selector -->
<p align="center">
  <a href="WEBHOOKS.md">English</a> ·
  <a href="WEBHOOKS.fr.md">Français</a> ·
  <a href="WEBHOOKS.de.md">Deutsch</a> ·
  <a href="WEBHOOKS.es.md">Español</a> ·
  <a href="WEBHOOKS.pt.md">Português</a> ·
  <a href="WEBHOOKS.ru.md">Русский</a> ·
  <a href="WEBHOOKS.zh-cn.md">简体中文</a> ·
  <a href="WEBHOOKS.ko.md">한국어</a> ·
  <a href="WEBHOOKS.ja.md">日本語</a> ·
  <a href="WEBHOOKS.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Webhooks

Poznote có thể thông báo cho các dịch vụ bên ngoài khi có sự kiện xảy ra trên instance bằng cách gửi **webhook đi (outgoing webhooks)**: các yêu cầu HTTP POST kèm JSON payload được gửi tới những endpoint mà bạn đã đăng ký. Nhờ vậy bạn dễ dàng kết nối Poznote với các công cụ tự động hóa như n8n, Zapier hoặc các script của riêng bạn.

Poznote chỉ **phát (emit)** webhook. Endpoint tiếp nhận làm gì với dữ liệu đó (gửi email, kích hoạt workflow, ghi log sự kiện, ...) hoàn toàn tùy thuộc vào phía tiếp nhận và nằm ngoài phạm vi của Poznote.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Quản lý webhook](#quản-lý-webhook)
- [Gửi webhook (Delivery)](#gửi-webhook-delivery)
  - [Định dạng yêu cầu](#định-dạng-yêu-cầu)
  - [Cấu trúc bao gói payload](#cấu-trúc-bao-gói-payload)
  - [Xác minh chữ ký](#xác-minh-chữ-ký)
  - [Bảo đảm gửi nhận](#bảo-đảm-gửi-nhận)
- [Liên kết trực tiếp tới ghi chú (Instance URL)](#liên-kết-trực-tiếp-tới-ghi-chú-instance-url)
- [Các đối tượng payload phổ biến](#các-đối-tượng-payload-phổ-biến)
  - [Đối tượng data.user](#đối-tượng-datauser)
  - [Đối tượng data.note](#đối-tượng-datanote)
- [Tham chiếu sự kiện](#tham-chiếu-sự-kiện)
  - [Sự kiện cấp instance](#sự-kiện-cấp-instance)
  - [Sự kiện cấp người dùng](#sự-kiện-cấp-người-dùng)
  - [Kiểm tra bằng ping](#kiểm-tra-bằng-ping)
- [Quyền riêng tư và bảo mật](#quyền-riêng-tư-và-bảo-mật)
- [Ví dụ dịch vụ tiếp nhận (receiver)](#ví-dụ-dịch-vụ-tiếp-nhận-receiver)

## Tổng quan

Có hai cấp độ webhook độc lập nhau:

| Cấp độ | Quản lý tại | Đối tượng | Sự kiện |
|---|---|---|---|
| **Admin Webhooks** | **Settings > Admin Tools > Admin Webhooks** | Chỉ quản trị viên | Các sự kiện cấp instance: `user.created`, `user.updated`, `user.activated`, `user.deactivated`, `user.deleted`, `settings.language_changed`, `signup.cap_reached`, `quota.notes_reached`, `quota.storage_reached`, `backup.completed`, `backup.failed` |
| **User Webhooks** | **Settings > User Webhooks** | Mọi tài khoản (trừ khi bị chặn bởi cơ chế cô lập người dùng) | Các sự kiện về nội dung của chính tài khoản đó: `note.created`, `note.shared`, `reminder.due`, `reminder.due_title`, `reminder.due_minimal` |

Quy tắc cô lập được áp dụng nghiêm ngặt: một sự kiện cấp người dùng chỉ bao giờ được gửi tới các endpoint do chính tài khoản tạo ra sự kiện đó đăng ký. Ghi chú và lời nhắc của người dùng này không bao giờ đi tới endpoint của người dùng khác. Các sự kiện cấp instance được gửi tới mọi admin webhook có đăng ký theo dõi.

## Quản lý webhook

Trên trang quản lý webhook (dành cho quản trị viên hoặc người dùng), mỗi webhook được cấu hình bằng các thông tin sau:

- **Endpoint URL**: phải bắt đầu bằng `http://` hoặc `https://`.
- **Description** (tùy chọn): ghi chú ngắn về mục đích của endpoint, ví dụ "Luồng n8n lưu ghi chú mới vào Notion". Thông tin này hiển thị trong danh sách để phân biệt nhiều endpoint và không bao giờ được gửi tới endpoint.
- **Secret** (tùy chọn): khi được đặt, mọi lần gửi đều được ký bằng HMAC-SHA256 để phía tiếp nhận xác thực được bên gửi. Xem [Xác minh chữ ký](#xác-minh-chữ-ký).
- **Events**: tập hợp các sự kiện mà endpoint này đăng ký nhận.

Mỗi webhook đã đăng ký có một menu hành động (nút **...** trên hàng tương ứng) cung cấp các tùy chọn:

- **Edit**: thay đổi endpoint URL, mô tả, secret và các sự kiện đã đăng ký. Biểu mẫu mở ra ngay bên dưới webhook và được điền sẵn các giá trị hiện tại.
- **Send test**: gửi ngay một sự kiện [ping](#kiểm-tra-bằng-ping) và hiển thị kết quả HTTP trả về.
- **Disable** / **Enable**: tạm dừng hoặc tiếp tục gửi mà không cần xóa cấu hình đã đăng ký.
- **Delete**: xóa webhook sau khi xác nhận.

Trang này cũng hiển thị kết quả của lần gửi gần nhất cho mỗi webhook (mã trạng thái HTTP, hoặc thông báo lỗi nếu không thể kết nối tới endpoint) kèm dấu thời gian.

Hệ thống cho phép đăng ký trùng cùng một URL hai lần, nhưng mỗi mục đăng ký sẽ nhận một lần gửi riêng cho từng sự kiện đã đăng ký, nên endpoint của bạn sẽ nhận được dữ liệu trùng lặp.

## Gửi webhook (Delivery)

### Định dạng yêu cầu

Mỗi lần gửi là một yêu cầu HTTP `POST` với phần thân JSON và các header sau:

| Header | Giá trị |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `Poznote-Webhook` |
| `X-Poznote-Event` | Tên sự kiện, ví dụ `note.created` |
| `X-Poznote-Delivery` | ID duy nhất của lần gửi (trùng với giá trị `delivery_id` trong phần thân) |
| `X-Poznote-Signature-256` | `sha256=<hex HMAC>` của phần thân thô (raw body). Chỉ có mặt khi webhook có đặt secret |

### Cấu trúc bao gói payload

Mọi payload đều dùng chung một cấu trúc bao gói; chỉ đối tượng `data` thay đổi theo từng sự kiện:

```json
{
  "event": "note.created",
  "delivery_id": "f3a1c9e2b4d86f70a1b2c3d4e5f60718",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": { }
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `event` | string | Tên sự kiện, xem [Tham chiếu sự kiện](#tham-chiếu-sự-kiện) |
| `delivery_id` | string | 32 ký tự hex, duy nhất cho mỗi lần gửi. Hai webhook cùng nhận một sự kiện sẽ có id khác nhau |
| `created_at` | string | Dấu thời gian ISO 8601 (UTC) của lần gửi |
| `data` | object | Payload riêng của sự kiện, được mô tả theo từng sự kiện bên dưới |

### Xác minh chữ ký

Khi webhook có thiết lập secret, Poznote gửi kèm header `X-Poznote-Signature-256: sha256=<signature>`, trong đó chữ ký là HMAC-SHA256 của **phần thân yêu cầu thô (raw request body)** được tạo khóa bằng secret (cùng cơ chế với webhook của GitHub). Hãy xác minh dựa trên dữ liệu byte thô trước khi phân tích cú pháp JSON, và sử dụng phép so sánh theo thời gian hằng số (constant-time comparison):

```js
// Node.js
const crypto = require('crypto');

function verify(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signatureHeader
    && expected.length === signatureHeader.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
```

```python
# Python
import hashlib, hmac

def verify(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")
```

Những yêu cầu không có chữ ký hợp lệ nên bị từ chối: bất kỳ ai biết được URL endpoint đều có thể POST các sự kiện giả mạo tới đó.

### Bảo đảm gửi nhận

- Việc gửi được thực hiện theo cơ chế **nỗ lực tối đa và đồng bộ (best-effort and synchronous)**, với thời gian chờ kết nối và phản hồi là 5 giây. Một endpoint chậm hoặc bị lỗi không bao giờ làm gián đoạn thao tác gốc (như đăng ký tài khoản hay tạo ghi chú) đã sinh ra sự kiện.
- Một lần gửi được xem là thành công khi nhận về bất kỳ phản hồi **2xx** nào. Hệ thống **không đi theo chuyển hướng (redirect)**.
- Các lần gửi thất bại đối với sự kiện cấp instance, `note.created` và `note.shared` **không được thử lại**.
- **Các sự kiện lời nhắc là ngoại lệ**: chúng được gửi theo cơ chế *ít nhất một lần (at least once)*. Một lời nhắc chỉ được đánh dấu là đã gửi khi mọi endpoint đăng ký đều chấp nhận nó; nếu không, toàn bộ sự kiện sẽ được tiến trình nền thử gửi lại (tối đa 5 lần, mỗi lần cách nhau 5 phút). Vì vậy các endpoint hoạt động bình thường vẫn có thể nhận trùng một sự kiện lời nhắc và nên khử trùng dựa trên `data.reminder.id`.
- Các lời nhắc đã đến hạn trước thời điểm tài khoản đăng ký webhook lời nhắc đầu tiên sẽ được bỏ qua, để việc bật webhook không làm ngập endpoint bằng toàn bộ danh sách tồn đọng cũ.

## Liên kết trực tiếp tới ghi chú (Instance URL)

Các payload có tham chiếu tới ghi chú có thể mang theo liên kết trực tiếp trong `data.note.url`, có dạng:

```
https://poznote.example.com/index.php?note=42&workspace=Poznote
```

Liên kết được dựng từ **Instance URL**, tức URL công khai của instance Poznote của bạn, cấu hình tại mục **Instance URL** trong **Settings > Admin Tools > Admin Webhooks** (chỉ quản trị viên). Đây là cùng một giá trị với URL của instance dùng trong email nhắc nhở, nên cài đặt ở một nơi sẽ áp dụng cho cả hai. Giá trị này cũng có thể đặt qua REST API (thiết lập `smtp_app_url`) hoặc dùng biến môi trường dự phòng `POZNOTE_APP_URL` (hay `APP_URL`). Các ứng dụng chat đăng nhập vào [MCP server](MCP-SERVER.vi.md) thông qua Poznote cũng được chuyển hướng tới địa chỉ này. Khi còn trống, nó sẽ tự được điền từ trình duyệt của quản trị viên trong lần đầu sử dụng Poznote; sau đó nó chỉ thay đổi khi được sửa trực tiếp tại đây.

Khi chưa cấu hình Instance URL, `data.note.url` có giá trị `null` và payload không mang theo liên kết nào.

## Các đối tượng payload phổ biến

### Đối tượng data.user

Các sự kiện cấp instance mô tả tài khoản liên quan bằng một đối tượng `user`:

```json
{
  "user": {
    "id": 7,
    "username": "nina",
    "email": "nina@example.com",
    "first_name": "Nina",
    "last_name": "Martin",
    "source": "admin"
  }
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | integer | ID người dùng trong Poznote |
| `username` | string | Tên đăng nhập |
| `email` | string or null | Địa chỉ email, là `null` khi hồ sơ không có email |
| `first_name` | string | Tên, có thể rỗng |
| `last_name` | string | Họ, có thể rỗng |
| `source` | string | Ai hoặc thành phần nào kích hoạt sự kiện. Có mặt trên các sự kiện `user.*`, vắng mặt trên các sự kiện quota. Các giá trị: `admin` (giao diện quản trị), `api` (REST API), `oidc` (đăng nhập SSO hoặc tự động cấp tài khoản), `self` (người dùng tự thao tác trên tài khoản của mình) |

Đối tượng user không bao giờ chứa mật khẩu, mã băm mật khẩu hay OIDC token.

### Đối tượng data.note

Các sự kiện cấp người dùng mô tả ghi chú liên quan bằng một đối tượng `note`. Các trường cụ thể phụ thuộc vào từng sự kiện (mỗi sự kiện bên dưới đều có ví dụ riêng), được lấy từ tập trường sau:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | integer | ID ghi chú, dùng được với [REST API](API-REST.md) (`GET /api/v1/notes/{id}`) |
| `heading` | string | Tiêu đề ghi chú |
| `type` | string | `note` (HTML) hoặc `markdown` |
| `workspace` | string | Workspace chứa ghi chú |
| `folder` | string | Thư mục chứa ghi chú |
| `created` | string | Dấu thời gian tạo |
| `url` | string or null | Liên kết trực tiếp tới ghi chú, là `null` khi chưa cấu hình [Instance URL](#liên-kết-trực-tiếp-tới-ghi-chú-instance-url) |

**Nội dung ghi chú không bao giờ được gửi đi**, chỉ gửi siêu dữ liệu (metadata).

## Tham chiếu sự kiện

### Sự kiện cấp instance

Quản lý tại **Settings > Admin Tools > Admin Webhooks**. Gửi tới mọi admin webhook đã đăng ký.

#### user.created

Một tài khoản người dùng đã được tạo: bởi quản trị viên, qua REST API, hoặc qua đăng ký tự động cấp tài khoản SSO.

```json
{
  "event": "user.created",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "user": {
      "id": 7,
      "username": "nina",
      "email": "nina@example.com",
      "first_name": "Nina",
      "last_name": "Martin",
      "language": "fr",
      "source": "oidc"
    }
  }
}
```

`data.user.source` nhận giá trị `admin`, `api` hoặc `oidc`.

`data.user.language` là mã ngôn ngữ giao diện đang lưu của tài khoản, mặc định
là `en` khi tài khoản chưa thiết lập tùy chọn ngôn ngữ nào.

#### user.updated

Thông tin hồ sơ người dùng đã thay đổi: tên đăng nhập, email, tên, họ hoặc vai trò quản trị. Sự kiện không được phát ra nếu không có gì thực sự thay đổi.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "admin" },
    "changed_fields": ["email", "is_admin"]
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.user` | Hồ sơ **sau khi** cập nhật |
| `data.changed_fields` | Mảng liệt kê các trường đã thay đổi, gồm `username`, `email`, `first_name`, `last_name`, `is_admin` |

`data.user.source` nhận giá trị `admin`, `api`, `oidc` hoặc `self`.

#### settings.language_changed

Ngôn ngữ giao diện của một người dùng đã được thay đổi tường minh trong phần cài đặt (hoặc qua REST API `PUT /api/v1/settings/language`). Việc tự động nhận ngôn ngữ trình duyệt khi đăng nhập không tự phát sinh sự kiện này, nhưng việc xác nhận ngôn ngữ được nhận diện đó trong hướng dẫn khởi đầu (startup guide) thì có. Ngoài hướng dẫn khởi đầu, không có sự kiện nào được phát nếu ngôn ngữ được chọn trùng với ngôn ngữ đang dùng. Sự kiện được gửi tới mọi admin webhook đã đăng ký.

```json
{
  "data": {
    "user": {
      "id": 7,
      "username": "nina",
      "email": "nina@example.com",
      "first_name": "Nina",
      "last_name": "Martin"
    },
    "language": "fr",
    "previous_language": "en",
    "source": "ui"
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.user` | Hồ sơ của tài khoản vừa thay đổi ngôn ngữ |
| `data.language` | Mã ngôn ngữ giao diện mới (`en`, `fr`, `de`, `es`, `pt`, `ru`, `zh-cn`, ...) |
| `data.previous_language` | Ngôn ngữ trước khi thay đổi, `null` nếu tài khoản trước đó chưa lưu ngôn ngữ nào |
| `data.source` | `ui` (giao diện web) hoặc `api` (REST API client xác thực bằng Basic hoặc Bearer) |

#### user.activated / user.deactivated

Một tài khoản người dùng vừa được kích hoạt lại, hoặc bị vô hiệu hóa và không thể đăng nhập được nữa. Khi cờ trạng thái hoạt động thay đổi cùng lúc với các trường hồ sơ khác, Poznote phát `user.activated`/`user.deactivated` cho cờ đó và một sự kiện `user.updated` riêng cho phần còn lại.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "admin" }
  }
}
```

#### user.deleted

Một tài khoản người dùng đã bị xóa. Payload mang thông tin hồ sơ **tại thời điểm ngay trước khi bị xóa**. `data.user.source` nhận giá trị `admin`, `api` hoặc `self` (người dùng tự xóa tài khoản của chính mình).

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "self" }
  }
}
```

#### signup.cap_reached

Một lượt đăng ký SSO bị từ chối do instance đã chạm giới hạn số lượng người dùng tối đa, giúp người vận hành nắm được các lượt đăng ký bị lỡ theo thời gian thực.

```json
{
  "data": {
    "max_users": 10,
    "attempted": {
      "username": "newcomer",
      "email": "newcomer@example.com"
    }
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.max_users` | Giới hạn số người dùng đã cấu hình |
| `data.attempted.username` | Tên đăng nhập mà lượt đăng ký bị từ chối dự định dùng, `null` nếu không rõ |
| `data.attempted.email` | Email của lượt đăng ký bị từ chối, `null` nếu không rõ |

#### quota.notes_reached

Một thao tác của người dùng bị chặn vì tài khoản đã chạm hạn mức số lượng ghi chú (bao gồm cả thùng rác).

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin" },
    "quota": {
      "max_notes": 500,
      "note_count": 500
    }
  }
}
```

#### quota.storage_reached

Một thao tác của người dùng (ghi ghi chú hoặc tải lên tệp đính kèm) bị chặn vì tài khoản đã chạm hạn mức dung lượng lưu trữ.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin" },
    "quota": {
      "max_storage_bytes": 1073741824,
      "used_bytes": 1073700000,
      "requested_bytes": 250000
    }
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.quota.max_storage_bytes` | Giới hạn đã cấu hình tính bằng byte |
| `data.quota.used_bytes` | Dung lượng đang sử dụng tính bằng byte |
| `data.quota.requested_bytes` | Kích thước của thao tác ghi vừa bị từ chối |
| `data.quota.pool` | Chỉ xuất hiện với giá trị `"s3"` khi lượt tải lên bị chặn nhắm vào hạn mức tệp đính kèm S3 thay vì lưu trữ cục bộ |

> **Giới hạn tần suất (Throttling):** các sự kiện hạn mức được điều tiết tối đa một lần gửi cho mỗi người dùng, mỗi loại sự kiện, trong mỗi giờ, để trường hợp người dùng chạm giới hạn liên tục không làm ngập endpoint. Đối tượng `data.user` không có trường `source` trên các sự kiện hạn mức.

#### backup.completed / backup.failed

Một lượt sao lưu tự động (lên bucket S3 hoặc thư mục cục bộ, theo lịch đặt trong trang cài đặt tương ứng) hoặc một lượt sao lưu do quản trị viên kích hoạt bằng **Back up now** đã hoàn tất. Mỗi lượt chạy chỉ gửi một sự kiện chứ không gửi theo từng người dùng: `backup.completed` khi mọi người dùng được chọn đều sao lưu thành công không lỗi, `backup.failed` khi có ít nhất một người dùng gặp lỗi, không thể dọn bản lưu cũ, không kết nối được tới đích lưu trữ hoặc không có ai được sao lưu. Các bản sao lưu do người dùng tự chạy cho riêng tài khoản của họ không phát sinh các sự kiện này.

```json
{
  "event": "backup.failed",
  "delivery_id": "…",
  "created_at": "2026-10-16T03:00:12+00:00",
  "data": {
    "backup": {
      "target": "s3",
      "trigger": "auto",
      "users": 3,
      "backed_up": 2,
      "errors": ["nina: Access Denied"]
    }
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.backup.target` | `s3` (bucket sao lưu S3) hoặc `local` (thư mục sao lưu cục bộ) |
| `data.backup.trigger` | `auto` (chạy theo lịch) hoặc `manual` (do quản trị viên khởi chạy) |
| `data.backup.users` | Số lượng người dùng được chọn cho lượt chạy |
| `data.backup.backed_up` | Số lượng tệp lưu trữ (archive) đã ghi thành công |
| `data.backup.errors` | Danh sách thông báo lỗi, có tiền tố là tên đăng nhập nếu lỗi liên quan tới một người dùng cụ thể, tối đa 10 mục. Rỗng ở sự kiện `backup.completed` |

> **Giám sát bằng healthchecks.io:** đăng ký hai webhook, một cái trỏ tới ping URL của check (`https://hc-ping.com/<uuid>`) đăng ký nhận `backup.completed` và cái còn lại trỏ tới cùng URL đó nối thêm `/fail` đăng ký nhận `backup.failed`. Đặt chu kỳ của check khớp với tần suất sao lưu: nếu worker bị dừng hoặc treo giữa chừng, sẽ không có sự kiện nào được gửi và việc thiếu tín hiệu ping sẽ kích hoạt cảnh báo.

### Sự kiện cấp người dùng

Quản lý tại **Settings > User Webhooks**. Chỉ gửi tới các endpoint do chính tài khoản tạo ra sự kiện đăng ký, đó là lý do các payload này không mang đối tượng `user`: endpoint thuộc về tài khoản đó, còn id ghi chú xác định đối tượng mục tiêu.

Quản trị viên có thể chặn tính năng này đối với người dùng không phải quản trị viên bằng tùy chọn cô lập người dùng **User webhooks** (**Settings > Admin Tools > Tenant isolation**). Khi bị chặn, người dùng thường không thể mở trang cấu hình và sự kiện của họ cũng không được gửi đi; quản trị viên không bao giờ bị ảnh hưởng bởi giới hạn này.

#### note.created

Một ghi chú vừa được tạo trong tài khoản, từ giao diện web hoặc qua REST API.

```json
{
  "event": "note.created",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "type": "markdown",
      "workspace": "Poznote",
      "folder": "Work",
      "created": "2026-08-09 12:34:56",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "source": "ui"
  }
}
```

`data.source` nhận giá trị `ui` (giao diện web) hoặc `api` (REST API client xác thực bằng thông tin Basic hoặc Bearer).

#### note.shared

Một liên kết chia sẻ công khai vừa được phát hành cho một ghi chú của tài khoản.

```json
{
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "workspace": "Poznote",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "share": {
      "token": "d41d8cd98f00b204e9800998ecf8427e",
      "url": "https://poznote.example.com/share/d41d8cd98f00b204e9800998ecf8427e",
      "has_password": false,
      "updated": false
    }
  }
}
```

| Trường | Mô tả |
|---|---|
| `data.share.token` | Token chia sẻ công khai |
| `data.share.url` | URL chia sẻ công khai |
| `data.share.has_password` | Liên kết có được bảo vệ bằng mật khẩu hay không |
| `data.share.updated` | `false` đối với ghi chú mới được chia sẻ lần đầu, `true` khi ghi chú đã chia sẻ trước đó và liên kết vừa được tạo lại |

#### reminder.due / reminder.due_title / reminder.due_minimal

Một trong các lời nhắc ghi chú của tài khoản đã đến giờ kích hoạt. Sự kiện này do tiến trình nền xử lý lời nhắc phát ra, độc lập với kênh email, nên nó vẫn kích hoạt ngay cả khi chưa cấu hình SMTP.

Ba biến thể cho phép bạn chọn lượng dữ liệu được phép rời khỏi instance; hãy đăng ký biến thể phù hợp với phía tiếp nhận:

**`reminder.due`**, payload đầy đủ, bao gồm tiêu đề ghi chú và nội dung lời nhắc:

```json
{
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "workspace": "Poznote",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "reminder": {
      "id": 17,
      "message": "Prepare the agenda",
      "trigger_at": "2026-08-09 14:00:00"
    }
  }
}
```

**`reminder.due_title`**, cùng thời điểm kích hoạt nhưng không có nội dung lời nhắc:

```json
{
  "data": {
    "note": { "id": 42, "heading": "Meeting notes", "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote" },
    "reminder": { "id": 17, "trigger_at": "2026-08-09 14:00:00" }
  }
}
```

**`reminder.due_minimal`**, chỉ gồm các mã định danh, không có bất kỳ nội dung hay tiêu đề ghi chú nào rời khỏi instance. Nếu cần, bên tiếp nhận có thể lấy thêm chi tiết qua [REST API](API-REST.md):

```json
{
  "data": {
    "note": { "id": 42 },
    "reminder": { "id": 17, "trigger_at": "2026-08-09 14:00:00" }
  }
}
```

> **Đảm bảo gửi ít nhất một lần (At-least-once delivery):** các sự kiện lời nhắc được thử gửi lại cho tới khi mọi endpoint đăng ký đều chấp nhận (tối đa 5 lần, mỗi lần cách nhau 5 phút), nên một endpoint có thể nhận cùng một lời nhắc nhiều hơn một lần. Hãy khử trùng dựa trên `data.reminder.id`.

### Kiểm tra bằng ping

Nút **Send test** trên các trang quản lý webhook sẽ gửi một sự kiện `ping` tới endpoint được chọn và báo cáo kết quả HTTP trả về. Sự kiện này tuân theo đúng cấu trúc bao gói và quy tắc ký như các sự kiện thật:

```json
{
  "event": "ping",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "message": "Poznote webhook test"
  }
}
```

## Quyền riêng tư và bảo mật

- **Nội dung ghi chú không bao giờ rời khỏi instance.** Các payload chỉ mang siêu dữ liệu: id, tiêu đề, workspace, thư mục, dấu thời gian. Hãy dùng `reminder.due_minimal` khi ngay cả tiêu đề cũng không được phép đi ra endpoint.
- **Không có thông tin đăng nhập trong payload.** Các đối tượng user không bao giờ chứa mật khẩu, mã băm hay token.
- **Phân tách nghiêm ngặt theo từng tài khoản.** Các sự kiện cấp người dùng chỉ được gửi tới những endpoint của chính tài khoản đã tạo ra chúng.
- **Xác thực bên gửi.** Hãy thiết lập secret và kiểm tra header `X-Poznote-Signature-256` trên mọi yêu cầu; một URL endpoint đơn thuần cần phải được xem như công khai.
- **Cô lập người dùng (Tenant isolation).** Tùy chọn cô lập "User webhooks" ngăn người dùng không phải quản trị viên chuyển tiếp siêu dữ liệu ghi chú của họ ra các endpoint bên ngoài, được thực thi ở cả giao diện lẫn thời điểm gửi webhook.
- Các lần gửi thất bại được ghi vào error log của PHP kèm URL endpoint và trạng thái lỗi.

## Ví dụ dịch vụ tiếp nhận (receiver)

Một chương trình tiếp nhận Node.js tối giản dùng để xác minh chữ ký và phản ứng theo sự kiện:

```js
const crypto = require('crypto');
const http = require('http');

const SECRET = process.env.POZNOTE_WEBHOOK_SECRET;

http.createServer((req, res) => {
  let chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    const sig = req.headers['x-poznote-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.writeHead(401).end();
      return;
    }

    const payload = JSON.parse(raw.toString());
    switch (payload.event) {
      case 'note.created':
        console.log(`New note #${payload.data.note.id}: ${payload.data.note.heading}`);
        break;
      case 'reminder.due':
        console.log(`Reminder: ${payload.data.reminder.message} (note ${payload.data.note.id})`);
        break;
    }

    res.writeHead(200).end('ok');
  });
}).listen(9099);
```

Trỏ một webhook tới `http://your-host:9099/` kèm secret khớp nhau, nhấn **Send test**, và bạn sẽ thấy sự kiện `ping` được gửi tới.
