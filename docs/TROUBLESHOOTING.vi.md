<!-- lang-selector -->
<p align="center">
  <a href="TROUBLESHOOTING.md">English</a> ·
  <a href="TROUBLESHOOTING.fr.md">Français</a> ·
  <a href="TROUBLESHOOTING.de.md">Deutsch</a> ·
  <a href="TROUBLESHOOTING.es.md">Español</a> ·
  <a href="TROUBLESHOOTING.pt.md">Português</a> ·
  <a href="TROUBLESHOOTING.ru.md">Русский</a> ·
  <a href="TROUBLESHOOTING.zh-cn.md">简体中文</a> ·
  <a href="TROUBLESHOOTING.ko.md">한국어</a> ·
  <a href="TROUBLESHOOTING.ja.md">日本語</a> ·
  <a href="TROUBLESHOOTING.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Khắc phục sự cố cài đặt

<details>
<summary><strong>Cảnh báo "mkdir() (permission denied)" hoặc "Connection failed"</strong></summary>
<br>

Nếu bạn gặp các lỗi như:
- `Warning: mkdir(): Permission denied in /var/www/html/db_connect.php`
- `Connection failed: SQLSTATE[HY000] [14] unable to open database file`
- Thư mục `database` được tạo với quyền sở hữu `root:root` thay vì `www-data:www-data`

Đây là sự cố đã được biết đến với việc mount volume Docker trên một số môi trường (Komodo, Portainer, v.v.). Trong một số cấu hình, container không thể tự thay đổi quyền trên các volume đã được mount.

**Giải pháp:** Trước khi khởi động container, hãy thiết lập đúng quyền trên máy host của bạn:

```bash
# Di chuyển vào thư mục Poznote của bạn
cd poznote

# Tạo cấu trúc thư mục data với quyền phù hợp
mkdir -p data/database

# Thiết lập quyền sở hữu cho UID 82 (www-data trong Alpine Linux)
sudo chown -R 82:82 data

# Khởi động container
docker compose up -d
```

</details>

<details>
<summary><strong>"Connection failed: SQLSTATE[HY000]: General error: 8 attempt to write a readonly database"</strong></summary>
<br>

Trước tiên, hãy thử dừng rồi khởi động lại container và đợi cơ sở dữ liệu được khởi tạo (sau đó tải lại trang).

Nếu cách đó không hiệu quả, hãy dừng container và sửa lại quyền sở hữu cho thư mục `data` (điều chỉnh UID/GID cho phù hợp với thiết lập của bạn, ví dụ dưới đây dùng 1000:1000):

```bash
docker compose down
sudo chown 1000:1000 -R data
```

> 💡 **Lưu ý:** UID 82 tương ứng với người dùng `www-data` trong Alpine Linux, vốn được sử dụng bởi Docker image của Poznote.

</details>

<a id="running-rootless"></a>
<details>
<summary><strong>Chạy ở chế độ rootless (docker-compose.rootless.yml)</strong></summary>
<br>

Poznote cũng cung cấp một biến thể image rootless chạy hoàn toàn dưới quyền một người dùng không đặc quyền (uid/gid `1000`, tên người dùng `poznote`) thay vì root, dành cho các môi trường không cho phép chạy bằng root bên trong container (Kubernetes `PodSecurityStandard` mức restricted, Podman rootless, `docker run --user`, v.v.).

Khác với image mặc định, biến thể này không có tiến trình root lúc khởi động để tự sửa quyền sở hữu của một bind mount không khớp từ máy host, vì vậy `./data` **bắt buộc phải thuộc quyền sở hữu của uid/gid 1000 trước lần khởi động đầu tiên**:

```bash
mkdir -p data
sudo chown -R 1000:1000 data
```

Nếu bỏ qua bước này, container sẽ thoát ngay lập tức khi khởi động kèm thông báo lỗi giải thích chính xác lệnh cần chạy.

Lưu ý rằng thường không cần dùng `sudo` cho bước này:

- Nếu người dùng trên máy host của bạn đã có sẵn uid `1000` (người dùng đầu tiên được tạo trên hầu hết các bản phân phối Linux), lệnh `mkdir -p data` sẽ tự tạo thư mục với đúng quyền sở hữu và bạn có thể bỏ qua hoàn toàn bước `chown`.
- Với Podman rootless hoặc Docker rootless, hãy chạy lệnh chown bên trong user namespace thay vì dùng quyền root:

```bash
# Podman rootless
podman unshare chown -R 1000:1000 data
# Docker rootless
rootlesskit chown -R 1000:1000 data
```

Để cài đặt mới, hãy làm theo [Phương pháp cài đặt rootless](README.vi.md#rootless) trong tệp README. Để chuyển đổi một instance Poznote đang có, hãy dừng nó lại, sao lưu và đổi lại quyền sở hữu cho thư mục data, sau đó khởi động biến thể rootless:

```bash
docker compose down
sudo chown -R 1000:1000 data
curl -o docker-compose.rootless.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.rootless.yml
docker compose -f docker-compose.rootless.yml pull
docker compose -f docker-compose.rootless.yml up -d
```

Webserver ở chế độ rootless lắng nghe nội bộ trên cổng `8080` thay vì `80` (chỉ dùng các cổng không cần đặc quyền); biến `HTTP_WEB_PORT` trong tệp `.env` vẫn điều khiển cổng phía máy host như bình thường.

Để tự build image rootless từ mã nguồn thay vì tải về, hãy thay dòng `image:` trong `docker-compose.rootless.yml` bằng `build: { context: ., target: rootless }` (khi đó bạn cần clone repository này về máy).

</details>

<a id="running-with-host-network"></a>
<details>
<summary><strong>Chạy với <code>network_mode: host</code></strong></summary>
<br>

Mặc định Docker ánh xạ một cổng của máy host vào container: web server lắng nghe trên cổng `80` bên trong container (`8080` đối với image rootless), còn `HTTP_WEB_PORT` chọn cổng trên máy host. Với `network_mode: host`, không có sự ánh xạ cổng nào. Container sẽ bind trực tiếp vào các cổng của máy host, nơi cổng `80` thường đã được dùng bởi một web server hoặc container khác.

Thiết lập cổng mà web server sẽ lắng nghe bằng biến `POZNOTE_LISTEN_PORT` trong `.env` (với image rootless, hãy chọn một cổng lớn hơn 1023):

```bash
POZNOTE_LISTEN_PORT=8040
```

Sau đó trong `docker-compose.yml` (hoặc `docker-compose.rootless.yml`), hãy thay mục `ports:` của cả hai service bằng `network_mode: host`. MCP server cần thêm hai thay đổi nữa: nó không thể gọi tới web server qua tên service được nữa, và image của nó mặc định lắng nghe trên mọi giao diện mạng, tức là trong chế độ host sẽ lắng nghe trên mọi giao diện mạng của máy host. Hãy trỏ nó tới cổng mới và bind nó về localhost:

```yaml
  mcp-server:
    image: ghcr.io/timothepoznanski/poznote-mcp:6
    restart: always
    network_mode: host
    command: ["sh", "-c", "poznote-mcp serve --host=127.0.0.1 --port=$${MCP_PORT}"]
    environment:
      POZNOTE_API_URL: http://127.0.0.1:${POZNOTE_LISTEN_PORT}/api/v1
      MCP_PORT: ${POZNOTE_MCP_PORT:-8045}
      POZNOTE_DEBUG: ${POZNOTE_DEBUG:-false}
      POZNOTE_USER_ID: ${POZNOTE_USER_ID:-1}
      POZNOTE_MCP_AUTH_TOKEN: ${POZNOTE_MCP_AUTH_TOKEN:-}
    volumes:
      - "./data:/var/www/html/data:ro"
    depends_on:
      - webserver
```

Tạo lại các container (lệnh restart thông thường không nạp lại các biến môi trường):

```bash
docker compose up -d --force-recreate
```

Giá trị này được script khởi tạo (init script) của container áp dụng mỗi lần khởi động; nếu giá trị không hợp lệ, lỗi sẽ được ghi vào log và hệ thống giữ nguyên mặc định của image. `HTTP_WEB_PORT` không còn được dùng nữa, và `POZNOTE_MCP_PORT` lúc này quyết định cổng mà MCP server lắng nghe. Phần kiểm tra tình trạng (health check) của tệp `docker-compose.yml` hiện tại cũng tuân theo `POZNOTE_LISTEN_PORT`: nếu tệp của bạn vẫn gọi `http://127.0.0.1/api/health`, hãy tải lại tệp hoặc sửa URL đó, nếu không container sẽ luôn ở trạng thái `unhealthy` hoặc kiểm tra nhầm dịch vụ khác đang phản hồi trên cổng `80`.

Ở chế độ host, web server lắng nghe trên mọi giao diện mạng của máy host: hãy lọc cổng đó bằng tường lửa của bạn, hoặc chỉ cho phép truy cập qua reverse proxy. Bên trong container, nginx và PHP giao tiếp qua unix socket, nên Poznote không chiếm thêm cổng nào khác trên máy host và nhiều instance có thể chạy song song trên các cổng khác nhau.

</details>

<details>
<summary><strong>"This site can't be reached"</strong></summary>
 <br>

Nếu bạn thấy thông báo "This site can't be reached" trên trình duyệt, có thể hệ thống của bạn đang bật SELinux. Trong trường hợp này, hãy kiểm tra log của container:

```bash
docker logs poznote-webserver-1
# hoặc với podman
podman logs poznote-webserver-1
```

Nhiều khả năng bạn sẽ thấy dòng lỗi:
- `chown: /var/www/html/data: Permission denied`

Lỗi này xảy ra khi volume Docker không có ngữ cảnh SELinux phù hợp, đặc biệt là khi cài đặt từ thư mục `/root`.

**Giải pháp:** Chúng tôi khuyến nghị mạnh mẽ việc thêm hậu tố `:Z` cho các volume Docker và tránh cài đặt trong thư mục `/root` để đảm bảo hoạt động ổn định trên mọi bản phân phối Linux.

Chỉnh sửa tệp `docker-compose.yml` của bạn để thêm `:Z` vào phần khai báo volume:

```yaml
volumes:
  - ./data:/var/www/html/data:Z
```

Hoặc bạn có thể cài đặt Poznote vào một thư mục nằm ngoài `/root`, chẳng hạn như `/opt/poznote` hoặc `~/poznote`.

</details>

<details>
<summary><strong>"Incorrect username or password"</strong></summary>
<br>

1. Thử đăng nhập với tên người dùng "admin" hoặc "admin_change_me" cùng mật khẩu của bạn.
2. Mật khẩu được quản lý thông qua giao diện Poznote, không phải qua `.env`. Cho đến khi mật khẩu được đổi trong giao diện web, các mật khẩu mặc định tích hợp sẵn sẽ được áp dụng: `admin` cho quản trị viên, `user` cho người dùng thông thường.
3. Nếu bạn đăng nhập được bằng tài khoản quản trị viên nhưng không đăng nhập được bằng tài khoản người dùng thông thường, hãy kiểm tra xem hồ sơ đó có đang được đánh dấu là **active** trong bảng User Management hay không.

</details>

<details>
<summary><strong>Mất mật khẩu quản trị viên</strong></summary>
<br>

Nếu vẫn còn một quản trị viên khác đăng nhập được, họ có thể đặt mật khẩu mới cho bạn từ **Settings > Admin Tools > User Management**. Nếu không, hãy đặt lại trực tiếp trong cơ sở dữ liệu master. Từ thư mục Poznote của bạn trên máy host (công cụ dòng lệnh `sqlite3` phải được cài sẵn trên máy host, vì nó không có trong image Poznote):

```bash
sudo sqlite3 data/master.db "UPDATE users SET password_hash=NULL, password_login_disabled=0 WHERE id=1;"
```

Lệnh này xóa mật khẩu đang lưu của tài khoản đầu tiên (id 1, luôn là quản trị viên), giúp mật khẩu mặc định tích hợp sẵn có hiệu lực trở lại: hãy đăng nhập bằng tên đăng nhập của tài khoản đó cùng mật khẩu `admin`, sau đó đổi lại ngay trong **Settings > Change Password**. Để đặt lại mật khẩu cho một tài khoản khác, thay `WHERE id=1` bằng `WHERE username='its_username'`; tài khoản người dùng thông thường sẽ quay về mật khẩu mặc định là `user`.

Nếu tài khoản đó đang bật xác thực hai yếu tố, biểu mẫu đăng nhập vẫn sẽ yêu cầu mã xác thực sau bước nhập mật khẩu. Xem mục tiếp theo nếu bạn cũng bị mất thiết bị xác thực.

</details>

<a id="two-factor-lockout"></a>
<details>
<summary><strong>Bị khóa do xác thực hai yếu tố (mất thiết bị và mã khôi phục)</strong></summary>
<br>

Mỗi mã khôi phục được cấp khi bật xác thực hai yếu tố có thể dùng để đăng nhập một lần: trên màn hình nhập mã, hãy chọn **Use a recovery code**. Nếu không còn mã nào, một quản trị viên có thể tắt xác thực hai yếu tố cho bạn trong **Settings > Admin Tools > User Management**, tại hộp thoại mật khẩu của tài khoản bạn.

Nếu bạn là quản trị viên duy nhất, hãy gỡ bỏ yếu tố xác thực thứ hai trực tiếp trong cơ sở dữ liệu master. Từ thư mục Poznote của bạn trên máy host (công cụ dòng lệnh `sqlite3` phải được cài đặt trên đó):

```bash
sudo sqlite3 data/master.db "DELETE FROM user_totp_recovery_codes WHERE user_id=1; DELETE FROM user_totp WHERE user_id=1;"
```

Thay `1` bằng id của tài khoản (chạy `sudo sqlite3 data/master.db "SELECT id, username FROM users;"` để liệt kê). Khi đó chỉ cần mật khẩu là bạn có thể đăng nhập lại, các cookie ghi nhớ đăng nhập (remember-me) đã cấp cho tài khoản đó sẽ hết hiệu lực, và bạn có thể thiết lập lại xác thực hai yếu tố từ **Settings > Two-factor authentication**.

Nếu xác thực hai yếu tố là bắt buộc trên toàn instance (**Settings > Admin Tools > Require two-factor**), lần đăng nhập tiếp theo sẽ yêu cầu thiết lập lại ngay lập tức. Để gỡ bỏ luôn yêu cầu bắt buộc này:

```bash
sudo sqlite3 data/master.db "UPDATE global_settings SET value='0' WHERE key='two_factor_required';"
```

</details>

<a id="the-app-stops-answering-under-load"></a>
<details>
<summary><strong>Ứng dụng ngừng phản hồi khi tải cao (lỗi tự động lưu, "server reached pm.max_children")</strong></summary>
<br>

Các yêu cầu PHP được xử lý bởi một pool cố định gồm các worker php-fpm, mặc định là 10. Các yêu cầu ngắn (tự động lưu, polling, tải trang) không bao giờ làm đầy pool này. Các yêu cầu kéo dài thì có thể: một câu trả lời trò chuyện AI đang được stream, một lời gọi tới S3, một tác vụ đồng bộ git, hoặc một lượt tải tệp lớn lên. Một khi tất cả worker đều bận, mọi yêu cầu khác phải chờ, trình duyệt sẽ báo lỗi mạng khi lưu, và log của container sẽ ghi:

```
WARNING: [pool www] server reached pm.max_children setting (10), consider raising it
```

Hãy tăng kích thước pool trên các instance có tải cao (nhiều người dùng, có sử dụng trò chuyện AI, S3 hoặc đồng bộ git) bằng biến `POZNOTE_PHP_FPM_MAX_CHILDREN` trong `.env`, sau đó tạo lại container (lệnh restart thông thường không nạp lại các biến môi trường):

```bash
POZNOTE_PHP_FPM_MAX_CHILDREN=20
docker compose up -d --force-recreate webserver
```

Mỗi worker đang xử lý tiêu tốn khoảng 25-30 MB bộ nhớ, còn số worker nhàn rỗi luôn ít bất kể giá trị đặt là bao nhiêu, vì vậy mức 20 an toàn cho máy host có 1 GB RAM và mức 10 phù hợp với máy host 512 MB. Giá trị này được script khởi tạo của container áp dụng mỗi lần khởi động; nếu giá trị không hợp lệ, lỗi sẽ được ghi vào log và hệ thống giữ nguyên mặc định của image.

</details>

<a id="a-request-runs-out-of-memory"></a>
<details>
<summary><strong>Một yêu cầu thất bại với lỗi "Allowed memory size exhausted"</strong></summary>
<br>

Mỗi yêu cầu PHP mặc định có thể dùng tối đa 512 MB. Đây là mức trần chứ không phải bộ nhớ cấp phát sẵn (một worker nhàn rỗi chỉ chiếm khoảng 25 MB), nhằm khiến một yêu cầu ngốn bộ nhớ bất thường thất bại kèm một dòng thông báo dễ đọc trong log PHP thay vì làm sập cả máy host:

```
PHP Fatal error:  Allowed memory size of 536870912 bytes exhausted (tried to allocate ...) in ...
```

Các thao tác sao lưu, khôi phục, xuất dữ liệu và tải xuống đều truyền dữ liệu trực tiếp ra đĩa (stream to disk) và chỉ cần vài MB bất kể dung lượng tài khoản lớn đến đâu, nên lỗi này chỉ có thể xảy ra với một ghi chú đơn lẻ nặng hàng chục MB. Nếu thao tác sao lưu hoặc tải xuống gặp phải lỗi này thì đó là một lỗi phần mềm (bug), vui lòng báo lại kèm dòng log tương ứng.

Để nâng giới hạn này, hãy đặt `POZNOTE_PHP_MEMORY_LIMIT` trong `.env` (một số nguyên tính bằng MB), sau đó tạo lại container (lệnh restart thông thường không nạp lại các biến môi trường):

```bash
POZNOTE_PHP_MEMORY_LIMIT=1024
docker compose up -d --force-recreate webserver
```

Không bao giờ đặt giá trị này vượt quá bộ nhớ của máy host: một yêu cầu dùng vượt mức RAM thực tế của máy sẽ bị nhân hệ điều hành (kernel) chấm dứt đột ngột mà không để lại thông báo nào, và có thể kéo sập toàn bộ container. Trên máy host 512 MB, hãy giữ nguyên mặc định. Giá trị này được script khởi tạo của container áp dụng mỗi lần khởi động; nếu giá trị không hợp lệ, lỗi sẽ được ghi vào log và hệ thống giữ nguyên mặc định của image.

</details>

<a id="this-address-is-not-allowed"></a>
<details>
<summary><strong>"This address is not allowed: it must be a public internet host"</strong></summary>
<br>

Một người dùng không phải quản trị viên đã nhập địa chỉ của một máy trong mạng nội bộ của bạn, hoặc của chính server Poznote, vào cấu hình webhook, Git Sync hoặc server AI, chuyển âm (transcription) hay MCP riêng của họ. Chỉ quản trị viên mới được phép kết nối tới các địa chỉ đó. Quản trị viên có thể cho phép host đó trong **Settings > Admin Tools > Integrations > Local network access**, xem [Truy cập mạng cục bộ cho người dùng không phải quản trị viên](README.vi.md#local-network-access).

Nếu host đã có trong danh sách cho phép nhưng thông báo lỗi vẫn xuất hiện, container Poznote không phân giải được tên miền đó: hệ thống cố tình hiển thị cùng một thông báo cho cả hai trường hợp để không tiết lộ thông tin về mạng nội bộ. Hãy kiểm tra việc phân giải tên từ bên trong container:

```bash
docker compose exec webserver getent hosts ollama.lan
```

Nếu lệnh không in ra gì, hãy nhập địa chỉ IP hoặc dải mạng của host vào danh sách cho phép thay cho tên miền của nó.

</details>
