<!-- lang-selector -->
<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.zh-cn.md">简体中文</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->


<p align="center">
  <img src="../images/poznote-logo-text.png" alt="Logo Poznote" width="400">
</p>

<h2 align="center">
Ghi chú mạnh mẽ, gọn nhẹ và không rườm rà.
</h2>

<h3 align="center">
Giải pháp thay thế miễn phí, tự lưu trữ (self-hosted), mã nguồn mở cho Notion, Obsidian, Evernote hoặc OneNote.
</h3>

<p align="center">
  <a href="https://poznote.com/video/poznote.mp4"><img src="../images/poznote-video.jpg" alt="Xem video giới thiệu Poznote" width="100%"></a>
</p>

<p align="center">
  <img src="../images/pres1.png" alt="Poznote-light" width="100%">
</p>

### Tính năng

Khám phá toàn bộ các tính năng [tại đây](https://poznote.com/#features).

### Ảnh chụp màn hình

Xem tất cả ảnh chụp màn hình [tại đây](https://poznote.com/screenshots.html).

### Bản demo

https://demo.poznote.com

**Tên đăng nhập**: poznote<br>
**Mật khẩu**: poznote

### Không muốn tự quản lý server?

Một nhà cung cấp hosting có thể vận hành sẵn Poznote cho bạn.<br>
[So sánh các nhà cung cấp](https://poznote.com/hosting.html) hoặc triển khai trực tiếp:

<p>
  <a href="https://www.pikapods.com/pods?run=poznote"><img src="https://www.pikapods.com/static/run-button.svg" alt="Chạy trên PikaPods" height="44"></a>
  <a href="https://calibernode.com/cloud-apps/poznote"><img src="../images/run-on-calibernode.svg" alt="Chạy trên Caliber Node" height="44"></a>
</p>

### Báo chí nói về Poznote

https://poznote.com/press.html

### Discord

Tham gia cộng đồng để đặt câu hỏi, chia sẻ góp ý hoặc theo dõi quá trình phát triển:

https://discord.gg/ADyrkPVMAf

## Mục lục

- [Cài đặt](#cài-đặt)
- [Truy cập](#truy-cập)
- [Thay đổi cài đặt](#thay-đổi-cài-đặt)
- [Cập nhật ứng dụng](#cập-nhật-ứng-dụng)
- [Xác thực](#xác-thực)
- [Mật khẩu ứng dụng](#mật-khẩu-ứng-dụng)
- [Các loại ghi chú](#các-loại-ghi-chú)
- [Lịch sử chỉnh sửa (Revisions)](#lịch-sử-chỉnh-sửa-revisions)
- [Cá nhân hóa](#cá-nhân-hóa)
- [Đa người dùng](#đa-người-dùng)
- [Chia sẻ và cộng tác](#chia-sẻ-và-cộng-tác)
- [Speed dial](#speed-dial)
- [Nhật ký hoạt động](#nhật-ký-hoạt-động)
- [Webhooks](#webhooks)
- [Đồng bộ Git](#đồng-bộ-git)
- [Lưu trữ tệp đính kèm trên S3](#lưu-trữ-tệp-đính-kèm-trên-s3)
- [Sao lưu / Xuất dữ liệu](#sao-lưu--xuất-dữ-liệu)
- [Khôi phục / Nhập dữ liệu](#khôi-phục--nhập-dữ-liệu)
- [Chế độ ngoại tuyến (Offline)](#chế-độ-ngoại-tuyến-offline)
- [Chạy nhiều instance](#chạy-nhiều-instance)
- [Trợ lý AI](#trợ-lý-ai)
- [Chuyển giọng nói thành văn bản (Transcription)](#chuyển-giọng-nói-thành-văn-bản-transcription)
- [MCP Server](#mcp-server)
- [Ứng dụng](#ứng-dụng)
- [Tiện ích mở rộng Chrome](#tiện-ích-mở-rộng-chrome)
- [Chia sẻ tới Poznote trên Android](#chia-sẻ-tới-poznote-trên-android)
- [Tài liệu API](#tài-liệu-api)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)

## Cài đặt

> Docker image chính thức hỗ trợ đa kiến trúc (linux/amd64, linux/arm64), chạy tốt trên Windows/macOS qua Docker Desktop cũng như các thiết bị ARM64 như Raspberry Pi, hệ thống NAS, v.v.

Chọn phương thức cài đặt phù hợp bên dưới:

<a id="windows"></a>
<details>
<summary><strong>🖥️ Windows</strong></summary>

#### Bước 1: Yêu cầu tiên quyết

Cài đặt và khởi chạy [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)

#### Bước 2: Triển khai Poznote

Tạo một thư mục mới:

```powershell
mkdir poznote
```

Di chuyển vào thư mục Poznote:
```powershell
cd poznote
```

Tạo tệp biến môi trường:

```powershell
curl -o .env https://raw.githubusercontent.com/timothepoznanski/poznote/main/.env.template
```

Chỉnh sửa tệp `.env`:

```powershell
notepad .env
```

Tải tệp cấu hình Docker Compose:

```powershell
curl -o docker-compose.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.yml
```

Tải các image Poznote Webserver và Poznote MCP mới nhất:
```powershell
docker compose pull
```

Khởi động các container Poznote:
```powershell
docker compose up -d
```

</details>

<a id="linux"></a>
<details>
<summary><strong>🐧 Linux</strong></summary>

#### Bước 1: Yêu cầu tiên quyết

1. Cài đặt [Docker engine](https://docs.docker.com/engine/install/)
2. Cài đặt [Docker Compose](https://docs.docker.com/compose/install/linux)

#### Bước 2: Cài đặt Poznote

Tạo một thư mục mới:
```bash
mkdir poznote
```

Di chuyển vào thư mục Poznote:
```bash
cd poznote
```

Tạo tệp biến môi trường:
```bash
curl -o .env https://raw.githubusercontent.com/timothepoznanski/poznote/main/.env.template
```

Chỉnh sửa tệp `.env`:
```bash
vi .env
```

Tải tệp cấu hình Docker Compose:
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.yml
```

Tải các image Poznote Webserver và Poznote MCP mới nhất:
```bash
docker compose pull
```

Khởi động các container Poznote:
```bash
docker compose up -d
```

</details>

<a id="macos"></a>
<details>
<summary><strong>🍎 macOS</strong></summary>

#### Bước 1: Yêu cầu tiên quyết

Cài đặt và khởi chạy [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/)

#### Bước 2: Triển khai Poznote

Tạo một thư mục mới:
```bash
mkdir poznote
```

Di chuyển vào thư mục Poznote:
```bash
cd poznote
```

Tải tệp biến môi trường:
```bash
curl -o .env https://raw.githubusercontent.com/timothepoznanski/poznote/main/.env.template
```

Chỉnh sửa tệp `.env`:
```bash
vi .env
```

Tải tệp cấu hình Docker Compose:
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.yml
```

Tải các image Poznote Webserver và Poznote MCP mới nhất:
```bash
docker compose pull
```

Khởi động các container Poznote:
```bash
docker compose up -d
```

</details>

<a id="cloud"></a>
<details>
<summary><strong>☁️ Cloud</strong></summary><br>

Không muốn tự quản trị server? Một nhà cung cấp hosting có thể vận hành Poznote thay bạn và giữ dịch vụ luôn trực tuyến. Xem danh sách các nhà cung cấp hiện có và cách lựa chọn [tại đây](https://poznote.com/hosting.html).

<p>
  <a href="https://www.pikapods.com/pods?run=poznote"><img src="https://www.pikapods.com/static/run-button.svg" alt="Chạy trên PikaPods" height="44"></a>
  <a href="https://calibernode.com/cloud-apps/poznote"><img src="../images/run-on-calibernode.svg" alt="Chạy trên Caliber Node" height="44"></a>
</p>

</details>

<a id="proxmox"></a>
<details>
<summary><strong>🗄️ Proxmox VE</strong></summary><br>

Trên máy chủ Proxmox VE, dự án Proxmox VE Community Scripts cài đặt Poznote trong một container riêng chỉ bằng một lệnh, không cần Docker: nó tạo một LXC Debian 13 unprivileged (mặc định 1 vCPU, 512 MB RAM và ổ đĩa 4 GB) rồi phục vụ Poznote qua nginx và PHP bên trong container đó.

Chạy lệnh sau từ shell của host Proxmox:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/poznote.sh)"
```

Sau đó Poznote phản hồi tại `http://<container-ip>:8040` với cùng thông tin đăng nhập mặc định như các kiểu cài đặt khác. Để cập nhật về sau, chạy `update` trong console của container.

Script này do cộng đồng viết và duy trì, không thuộc Poznote. Xem [trang script Poznote](https://community-scripts.org/scripts/poznote) để biết các tùy chọn và lưu ý.

</details>

<a id="kubernetes"></a>
<details>
<summary><strong>☸️ Kubernetes với Helm</strong></summary>

#### Bước 1: Yêu cầu tiên quyết

Cài đặt [Helm](https://helm.sh/docs/intro/install/) và đảm bảo Kubernetes context của bạn đang trỏ tới cluster nơi bạn muốn triển khai Poznote.

#### Bước 2: Triển khai Poznote

Thêm kho biểu đồ HelmForge:

```bash
helm repo add helmforge https://repo.helmforge.dev
```

Cập nhật chỉ mục chart cục bộ:

```bash
helm repo update
```

Cài đặt Poznote:

```bash
helm install poznote helmforge/poznote --namespace poznote --create-namespace
```

Helm chart của Poznote được cộng đồng HelmForge duy trì như một phương án cài đặt gốc trên Kubernetes. Xem [tài liệu Helm chart Poznote của HelmForge](https://helmforge.dev/docs/charts/poznote) để biết các giá trị cấu hình, lưu trữ bền vững, cấu hình service, probe, security context và các thiết lập cho môi trường production.

</details>

<a id="rootless"></a>
<details>
<summary><strong>🔒 Rootless</strong></summary><br>

Poznote cũng phát hành biến thể image rootless chạy hoàn toàn dưới người dùng không đặc quyền (uid/gid `1000`) thay vì root, dành cho các môi trường cấm quyền root trong container (Kubernetes `PodSecurityStandard` ở mức restricted, Podman rootless, `docker run --user`, v.v.). Biến thể này hoạt động giống hệt image mặc định; điểm khác biệt duy nhất là nó lắng nghe nội bộ ở cổng `8080` và không thể tự sửa quyền sở hữu thư mục dữ liệu khi khởi động.

#### Bước 1: Yêu cầu tiên quyết

1. Cài đặt [Docker engine](https://docs.docker.com/engine/install/)
2. Cài đặt [Docker Compose](https://docs.docker.com/compose/install/linux)

#### Bước 2: Triển khai Poznote

Tạo một thư mục mới:
```bash
mkdir poznote
```

Di chuyển vào thư mục Poznote:
```bash
cd poznote
```

Tạo thư mục dữ liệu và gán quyền sở hữu cho uid/gid `1000` (**bắt buộc**: khác với image mặc định, container rootless không thể tự sửa quyền sở hữu này khi khởi động):
```bash
mkdir -p data
sudo chown -R 1000:1000 data
```

Thường thì không cần `sudo` ở bước này: nếu user của bạn đã có uid `1000`, bạn có thể bỏ qua `chown`, và trên Podman/Docker rootless bạn có thể chạy không cần root, xem [Chạy chế độ rootless](TROUBLESHOOTING.vi.md#running-rootless).

Tạo tệp biến môi trường:
```bash
curl -o .env https://raw.githubusercontent.com/timothepoznanski/poznote/main/.env.template
```

Chỉnh sửa tệp `.env`:
```bash
vi .env
```

Tải tệp cấu hình Docker Compose bản rootless:
```bash
curl -o docker-compose.rootless.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.rootless.yml
```

Tải các image Poznote Webserver rootless và Poznote MCP mới nhất:
```bash
docker compose -f docker-compose.rootless.yml pull
```

Khởi động các container Poznote:
```bash
docker compose -f docker-compose.rootless.yml up -d
```

Để chuyển đổi một instance Poznote đang có sang biến thể rootless, hoặc xem thêm chi tiết, tham khảo [Chạy chế độ rootless](TROUBLESHOOTING.vi.md#running-rootless) trong Hướng dẫn khắc phục sự cố.

</details>

<br>

> Nếu gặp vấn đề trong quá trình cài đặt, xem [Hướng dẫn khắc phục sự cố](TROUBLESHOOTING.vi.md).

## Truy cập

Sau khi cài đặt, truy cập Poznote qua trình duyệt web:

[http://localhost:8040](http://localhost:8040)


- Tên đăng nhập: `admin_change_me`
- Mật khẩu: `admin`
- Cổng: `8040`

Hãy đổi tên tài khoản quản trị mặc định và đổi mật khẩu mặc định ngay sau lần đăng nhập đầu tiên.

## Thay đổi cài đặt

Phần lớn các thiết lập hằng ngày được thay đổi ngay trong giao diện Poznote. Chỉ dùng tệp `.env` cho các giá trị triển khai/runtime được đọc khi container khởi động.

<details>
<summary><strong>Dùng tệp <code>.env</code> cho</strong></summary>
<br>

- `HTTP_WEB_PORT`
- `POZNOTE_OIDC_CLIENT_ID`
- `POZNOTE_OIDC_CLIENT_SECRET`
- `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN`
- Các giá trị ghi đè runtime tùy chọn như `POZNOTE_MCP_PORT` và `POZNOTE_DEBUG`
- `POZNOTE_PHP_FPM_MAX_CHILDREN` để thay đổi số lượng yêu cầu PHP đồng thời (mặc định 10) trên các instance bận rộn, xem [Hướng dẫn khắc phục sự cố](TROUBLESHOOTING.vi.md#the-app-stops-answering-under-load)
- `POZNOTE_PHP_MEMORY_LIMIT` để thay đổi giới hạn bộ nhớ PHP cho mỗi yêu cầu, tính bằng MB (mặc định 512), xem [Hướng dẫn khắc phục sự cố](TROUBLESHOOTING.vi.md#a-request-runs-out-of-memory)
- `POZNOTE_LISTEN_PORT` để đổi cổng mà web server lắng nghe bên trong container (mặc định 80), chỉ cần khi dùng `network_mode: host`, xem [Hướng dẫn khắc phục sự cố](TROUBLESHOOTING.vi.md#running-with-host-network)
- `POZNOTE_SETTINGS_PASSWORD` để yêu cầu thêm một mật khẩu phụ trước khi mở trang Cài đặt, mặc định để trống
- `POZNOTE_MCP_AUTH_TOKEN` để yêu cầu bearer token từ các MCP client, cùng các biến `POZNOTE_MCP_*` khác để chọn cách client đăng nhập và các công cụ chúng được gọi, xem [MCP Server](#mcp-server)

</details>

<details>
<summary><strong>Dùng giao diện web cho</strong></summary>
<br>

- Cài đặt quản trị/toàn cục như nhà cung cấp OIDC, bật Git Sync, giới hạn nhập dữ liệu và tải lên CSS tùy chỉnh
- Cài đặt người dùng/hồ sơ như mật khẩu tài khoản cục bộ, giao diện (theme), cỡ chữ, sắp xếp ghi chú, ảnh nền workspace và ẩn bớt thành phần giao diện

</details>


### Chỉnh sửa cài đặt hệ thống (`.env`)

Di chuyển vào thư mục Poznote của bạn:
```bash
cd poznote
```

Dừng các container Poznote đang chạy:
```bash
docker compose down
```

Chỉnh sửa tệp `.env` bằng trình soạn thảo bạn quen dùng (ví dụ `nano .env` hoặc `notepad .env`).

Lưu tệp và khởi động lại các container để áp dụng thay đổi:
```bash
docker compose up -d
```

## Cập nhật ứng dụng

Di chuyển vào thư mục Poznote của bạn:
```bash
cd poznote
```

Dừng các container đang chạy trước khi cập nhật:
```bash
docker compose down
```

Tải cấu hình Docker Compose mới nhất:
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.yml
```

Tải tệp `.env.template` mới nhất:
```bash
curl -o .env.template https://raw.githubusercontent.com/timothepoznanski/poznote/main/.env.template
```

Dùng `sdiff` để đối chiếu `.env.template` và bổ sung các biến mới vào tệp `.env` nếu cần:
```bash
sdiff .env .env.template
```

Tải các image Poznote Webserver và Poznote MCP mới nhất:
```bash
docker compose pull
```

Khởi động các container đã cập nhật:
```bash
docker compose up -d
```

Dữ liệu của bạn được bảo toàn trong thư mục `./data` và không bị ảnh hưởng khi cập nhật.

### Phiên bản Beta

Các phiên bản Beta mang lại tính năng mới trước khi phát hành chính thức (stable), và được liệt kê dưới dạng bản phát hành thử nghiệm (pre-release) trên [trang releases](https://github.com/timothepoznanski/poznote/releases). Chúng được xuất bản dưới thẻ `latest-and-beta`, thẻ này luôn trỏ tới phiên bản mới nhất, dù là beta hay stable.

Để sử dụng, hãy sửa hai dòng `image` trong `docker-compose.yml` và giữ nguyên phần còn lại của tệp:
```yaml
services:
  webserver:
    image: ghcr.io/timothepoznanski/poznote:latest-and-beta
    ...
  mcp-server:
    image: ghcr.io/timothepoznanski/poznote-mcp:latest-and-beta
    ...
```

Với biến thể [rootless](#rootless), image webserver trong `docker-compose.rootless.yml` trở thành `poznote:latest-and-beta-rootless`, còn image MCP vẫn là `poznote-mcp:latest-and-beta`.

Tải image về và khởi động lại container:
```bash
docker compose pull
docker compose up -d
```

*   **Trước khi chuyển:** bản beta có thể vẫn còn lỗi, vì vậy hãy tạo một [bản sao lưu](#sao-lưu--xuất-dữ-liệu) trước. Mọi lỗi phát sinh có thể báo tại [GitHub issues](https://github.com/timothepoznanski/poznote/issues) hoặc trên [Discord](https://discord.gg/ADyrkPVMAf).
*   **Cập nhật:** mỗi lần chạy `docker compose pull` sau đó sẽ kéo bản beta mới nhất, hoặc bản stable ngay khi nó được phát hành. Quy trình cập nhật ở trên tải về tệp `docker-compose.yml` mới sử dụng lại thẻ stable, nên hãy sửa lại hai dòng `image` thêm một lần nữa sau bước đó.
*   **Quay về stable:** bản beta có thể thay đổi cấu trúc cơ sở dữ liệu, nên việc hạ cấp về bản stable cũ hơn có thể không hoạt động. Hãy đợi bản stable tiếp theo có chứa các thay đổi của bản beta đó, rồi làm theo quy trình cập nhật ở trên.

## Xác thực

Poznote hỗ trợ nhiều phương thức xác thực bao gồm tài khoản cục bộ và nhà cung cấp danh tính bên ngoài. Các ứng dụng và tiện ích mở rộng giao tiếp với REST API sử dụng [mật khẩu ứng dụng](#mật-khẩu-ứng-dụng), một thông tin đăng nhập riêng được trình bày ở mục tiếp theo.

<details>
<summary><strong>Xác thực tài khoản cục bộ</strong></summary>
<br>

Poznote xác thực người dùng dựa trên hồ sơ của họ bằng tên đăng nhập hoặc địa chỉ email cùng mật khẩu.


#### Tài khoản mặc định

Khi cài đặt mới, Poznote tạo sẵn một hồ sơ quản trị đang hoạt động:

- Tên đăng nhập: `admin_change_me`
- Mật khẩu: `admin`

Hãy đổi mật khẩu mặc định và đổi tên tài khoản ngay sau lần đăng nhập đầu tiên.

#### Quản lý mật khẩu

Mật khẩu được quản lý thông qua giao diện web Poznote, không phải qua `.env`:

- Người dùng có thể tự đổi mật khẩu tại **Settings > Change Password**.
- Quản trị viên có thể đặt mật khẩu tùy chỉnh cho bất kỳ người dùng nào hoặc đặt lại về mặc định tại **Settings > Admin Tools > User Management**.
- Tùy chọn **Remember me** giữ phiên đăng nhập trong 30 ngày.
- Một phiên đăng nhập kéo dài 7 ngày khi không có hoạt động và vẫn duy trì sau khi đóng trình duyệt. Đây cũng là cơ chế giữ phiên cho đăng nhập SSO (vốn không bao giờ nhận cookie remember-me), nhờ vậy tài khoản bị vô hiệu hóa ở nhà cung cấp danh tính sẽ mất quyền truy cập khi phiên hết hạn. Đặt `POZNOTE_SESSION_LIFETIME_DAYS` trong `.env` nếu muốn đổi sang số ngày nguyên khác, từ 1 đến 400.
- Đổi mật khẩu sẽ hủy hiệu lực các cookie remember-me hiện có của người dùng đó.
- **Settings > My Account > Connected devices** liệt kê các trình duyệt đang đăng nhập vào tài khoản của bạn kèm thời điểm hoạt động gần nhất, và cho phép đăng xuất những thiết bị bạn không còn sử dụng.

#### Xác thực hai yếu tố (2FA)

Mỗi người dùng có thể bật xác thực hai yếu tố (TOTP) tại **Settings > Two-factor authentication**. Sau bước nhập mật khẩu, biểu mẫu đăng nhập sẽ hỏi thêm mã 6 chữ số từ ứng dụng xác thực (Aegis, Google Authenticator, 1Password, Bitwarden...).

- Quá trình thiết lập hiển thị mã QR được vẽ trực tiếp trong trình duyệt và mười mã khôi phục dùng một lần để lưu phòng khi mất điện thoại.
- Tính năng này bảo vệ phần đăng nhập bằng mật khẩu. Đăng nhập SSO sẽ do nhà cung cấp danh tính và yếu tố thứ hai của riêng họ đảm nhiệm.
- Khi đang bật, REST API không còn chấp nhận chỉ mật khẩu tài khoản nữa: hãy cấp cho client một [mật khẩu ứng dụng](#mật-khẩu-ứng-dụng), hoặc gửi mã OTP hiện tại trong header `X-Poznote-OTP`.
- Quản trị viên có thể tắt 2FA cho người dùng bị mất cả thiết bị lẫn mã khôi phục tại **Settings > Admin Tools > User Management** (hộp thoại mật khẩu).
- Quản trị viên có thể bắt buộc mọi tài khoản đăng nhập bằng mật khẩu phải dùng 2FA tại **Settings > Admin Tools > Require two-factor**. Tài khoản nào chưa bật sẽ được yêu cầu thiết lập ở lần đăng nhập kế tiếp (mã QR và mã đầu tiên ngay trên trang đăng nhập), các phiên mở không có 2FA sẽ kết thúc, và chủ tài khoản không thể tự tắt được nữa. Đăng nhập SSO không bị ảnh hưởng.
- Bật hoặc tắt 2FA đều làm mất hiệu lực các cookie remember-me hiện có của người dùng đó.

#### Mật khẩu mặc định

- Tài khoản quản trị viên: `admin`
- Tài khoản người dùng chuẩn: `user`

Khi người dùng chưa đổi mật khẩu, giá trị mặc định trên sẽ được áp dụng. Một khi mật khẩu được đổi qua giao diện, chuỗi băm bcrypt an toàn sẽ được lưu vào cơ sở dữ liệu và được ưu tiên sử dụng.

</details>

<a id="oidc"></a>
<details>
<summary><strong>Xác thực OIDC / SSO (Tùy chọn)</strong></summary>
<br>

Poznote hỗ trợ OpenID Connect (authorization code + PKCE) cho tích hợp đăng nhập một lần (SSO). Nhờ đó người dùng có thể đăng nhập bằng các nhà cung cấp danh tính bên ngoài như Auth0, Keycloak, Azure AD hoặc Google Identity.

#### Cách hoạt động

1. Trang đăng nhập hiển thị nút `Continue with [Provider Name]` khi OIDC được bật.
2. Người dùng xác thực bằng luồng authorization code của OIDC có bảo vệ bởi PKCE.
3. Quyền truy cập có thể được giới hạn bằng các nhóm được phép (allowed groups) và, nếu cần, danh sách người dùng được phép kiểu cũ.
4. Sau khi xác thực, Poznote liên kết danh tính theo `sub` (`oidc_subject`), rồi mới theo email đã xác minh (email do quản trị viên đặt hoặc đồng bộ từ nhà cung cấp, không phân biệt hoa thường). Hồ sơ sẵn có không bao giờ được liên kết theo tên đăng nhập: để liên kết một hồ sơ ở lần đăng nhập SSO đầu tiên, hãy gán cho nó đúng email mà nhà cung cấp gửi về hoặc dán OIDC subject của nó vào **Settings > Admin Tools > User Management**. Lần đăng nhập đầu tiên bị từ chối sẽ ghi lại giá trị subject vào log để tiện sao chép.
5. Nếu bật tự động tạo người dùng và không có hồ sơ nào khớp, Poznote sẽ tự tạo mới một hồ sơ. Hồ sơ như vậy **hoàn toàn không có mật khẩu**: nó chưa từng đi qua bước bàn giao thông tin đăng nhập ban đầu khi quản trị viên tạo tài khoản, nên không chấp nhận mật khẩu mặc định. Việc đăng nhập đi qua nhà cung cấp danh tính, hoặc quản trị viên đặt mật khẩu tường minh từ **Settings > Admin Tools > User Management**.
6. Nếu `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN=true`, biểu mẫu tên đăng nhập/mật khẩu sẽ bị ẩn và trang đăng nhập chỉ còn chế độ SSO.
7. Các client gọi REST API có thể xác thực bằng `Authorization: Bearer <OIDC JWT>` khi OIDC đang bật; Poznote kiểm tra JWKS của nhà cung cấp, issuer, thời hạn, audience và các quy tắc kiểm soát truy cập đã cấu hình.
8. Các client hoàn toàn không thể chạy luồng OIDC (tiện ích trình duyệt, ứng dụng di động, script) sẽ sử dụng [mật khẩu ứng dụng](#mật-khẩu-ứng-dụng) để thay thế, do từng người dùng tự tạo trong phần cài đặt của mình.
9. [Xác thực hai yếu tố](#xác-thực-hai-yếu-tố-2fa) chỉ áp dụng cho biểu mẫu mật khẩu: đăng nhập SSO không bao giờ hỏi mã của Poznote. Thay vào đó hãy bật yêu cầu xác thực hai bước ở phía nhà cung cấp danh tính. Người dùng vừa có mật khẩu vừa có danh tính SSO sẽ giữ cả hai đường đăng nhập, và đường SSO an toàn tương ứng với chính sách của nhà cung cấp.

#### Cấu hình

OIDC được cấu hình từ **giao diện quản trị**: vào **Settings > Admin Tools > OIDC / SSO**.

Hầu hết các thiết lập (bật/tắt, issuer, tên nhà cung cấp, scopes, kiểm soát truy cập, nhóm/người dùng được phép, tự động tạo user, hành vi HTTP Basic Auth, v.v.) đều được quản lý tại trang này và lưu trong cơ sở dữ liệu.

Đối với xác thực Bearer JWT trên REST API, hãy cấu hình **API JWT audience** nếu nhà cung cấp của bạn phát hành access token cho một audience API riêng. Khi để trống, Poznote chấp nhận OIDC Client ID đã cấu hình làm JWT audience.

Các thiết lập sau vẫn nằm trong tệp `.env`:

```bash
POZNOTE_OIDC_CLIENT_ID=your_client_id
POZNOTE_OIDC_CLIENT_SECRET=your_client_secret
POZNOTE_OIDC_DISABLE_NORMAL_LOGIN=false
```

Dùng `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN=true` nếu bạn muốn ẩn biểu mẫu đăng nhập tên/mật khẩu cục bộ và ép chỉ đăng nhập qua SSO. Đây là công tắc duy nhất chặn xác thực bằng mật khẩu: nó gỡ bỏ biểu mẫu, từ chối các yêu cầu POST mật khẩu ở phía server và ẩn mục "Change Password".

> **Khôi phục khi nhà cung cấp danh tính gặp sự cố.** Chỉ-SSO nghĩa là đúng như vậy: khi `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN=true`, không ai đăng nhập được bằng mật khẩu kể cả quản trị viên, nên không có lối thoát nào trên trình duyệt. Điều này là có chủ ý, để kẻ tấn công chiếm được tài khoản quản trị cũng không thể tự bật lại đăng nhập mật khẩu nhằm tạo cửa hậu lâu dài. Để khôi phục cần quyền truy cập server: đặt `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN=false` trong `.env`, khởi động lại container, rồi đăng nhập bằng mật khẩu cục bộ. Trước khi bật chỉ-SSO, hãy chắc chắn có ít nhất một tài khoản quản trị đã được đặt mật khẩu tường minh (**Settings > Admin Tools > User Management**), nếu không việc bật lại cờ này cũng không cứu được. Lưu ý rằng hồ sơ quản trị được tạo tự động bởi OIDC sẽ chưa có mật khẩu cho đến khi được đặt.

> **Thay đổi không tương thích ngược:** các cài đặt OIDC cũ trong `.env` không còn được đọc nữa, ngoại trừ `POZNOTE_OIDC_CLIENT_ID`, `POZNOTE_OIDC_CLIENT_SECRET` và `POZNOTE_OIDC_DISABLE_NORMAL_LOGIN`. Sau khi nâng cấp, hãy nhập lại các thiết lập OIDC còn lại trong trang quản trị.

#### Các URL cần đăng ký với nhà cung cấp danh tính

Khi tạo ứng dụng (client) trên hệ thống nhà cung cấp danh tính của bạn, hãy đăng ký URL đầu tiên bên dưới làm redirect URI (còn gọi là callback URL), và URL thứ hai làm post-logout redirect URI nếu nhà cung cấp yêu cầu:

```text
https://YOUR_SERVER/oidc_callback.php
https://YOUR_SERVER/login.php
```

Poznote tự tạo cả hai URL dựa trên tên host mà yêu cầu đi tới, luôn với tiền tố `https://`. Nếu nhà cung cấp yêu cầu giá trị khác, hãy đặt **Redirect URI** hoặc **Post-logout redirect URI** trong phần Advanced của trang quản trị OIDC, rồi đăng ký đúng giá trị đó.

Discovery URL thường không cần điền: Poznote tự nối `/.well-known/openid-configuration` vào sau **Issuer URL**. Ví dụ với Authentik, issuer là `https://AUTHENTIK_HOST/application/o/APPLICATION_SLUG/`. Chỉ đặt **Discovery URL** nếu nhà cung cấp của bạn công bố tài liệu đó ở một đường dẫn khác.

#### Ví dụ kiểm soát truy cập (Nhóm + Tự động cấp tài khoản)

Từ trang quản trị OIDC, cấu hình:
- **Groups claim:** `groups`
- **Allowed groups:** `poznote`
- **Auto-create users:** bật

Khi bật tự động cấp tài khoản, Poznote tạo tên đăng nhập từ các OIDC claim (`preferred_username`, `nickname`, phần tên của email, `name`, rồi tới `sub`) và lưu OIDC subject vào hồ sơ vừa tạo. Nếu một hồ sơ sẵn có chưa từng đăng nhập bằng SSO đã mang `preferred_username` đó, lần đăng nhập sẽ bị từ chối thay vì tạo thêm một hồ sơ thứ hai bên cạnh: hãy gán cho hồ sơ đó email mà nhà cung cấp gửi về, hoặc OIDC subject của nó, để liên kết.

</details>

## Mật khẩu ứng dụng

Các ứng dụng không thể đăng nhập qua nhà cung cấp danh tính theo cách trình duyệt làm. Một **mật khẩu ứng dụng (app password)** là thông tin xác thực tách biệt mà bạn tạo cho một client cụ thể (tiện ích trình duyệt, điện thoại, script) và có thể thu hồi bất kỳ lúc nào, để bạn không bao giờ phải đưa mật khẩu tài khoản chính ra ngoài.

Tạo mật khẩu mới tại **Settings > App passwords**: đặt tên cho nó, tùy chọn thời hạn hết hạn, rồi sao chép chuỗi bí mật được sinh ra. Chuỗi này chỉ hiển thị một lần duy nhất và không xem lại được. Sau đó, trong ứng dụng client, nhập tên đăng nhập thường dùng của bạn và nhập mật khẩu ứng dụng vào ô mật khẩu. Nó được truyền qua HTTP Basic Auth thông thường, nên mọi client hiện có đều hoạt động ngay:

```bash
curl -u 'username:pzn_2f7c…' https://YOUR_SERVER/api/v1/notes
```

Mật khẩu ứng dụng chỉ truy cập được REST API và chỉ trong phạm vi hồ sơ của chính bạn: nó không thể mở giao diện web, gọi các endpoint quản trị, đổi mật khẩu hay quản lý tài khoản, ngay cả khi tài khoản đó là quản trị viên. Do đó nếu bị lộ, nó chỉ làm lộ ghi chú của một tài khoản đó và không gì hơn, và thu hồi nó sẽ đóng lỗ hổng ngay lập tức. Trên các instance chỉ dùng SSO (nơi tài khoản tạo qua OIDC không có mật khẩu), đây là thông tin xác thực duy nhất API chấp nhận qua Basic Auth.

Danh sách đầy đủ các giới hạn và endpoint quản lý mật khẩu ứng dụng nằm trong [tài liệu REST API](API-REST.md#authentication).

## Các loại ghi chú

Poznote có nhiều loại ghi chú khác nhau, mỗi loại phù hợp với một cách làm việc riêng. Rich text và Markdown là hai định dạng ghi chú cốt lõi; các loại khác bên dưới được xây dựng trên hai nền tảng đó.

<details>
<summary><strong>Ghi chú Rich Text</strong></summary>
&nbsp;

*   **Trình soạn thảo:** Chỉnh sửa trực quan WYSIWYG (What You See Is What You Get).
*   **Lưu trữ:** Lưu thành các tệp `.html` trong thư mục dữ liệu người dùng. Vì là HTML chuẩn, chúng có thể mở trực tiếp bằng bất kỳ trình duyệt web nào.
*   **Tính năng riêng:**
    *   **Định dạng phong phú:** Hỗ trợ gốc màu chữ, tô sáng (highlight) và các thẻ HTML chuẩn.
    *   **Giao diện tương tác:** Thao tác trực tiếp các phần tử ngay trong trình soạn thảo.
</details>

<details>
<summary><strong>Ghi chú Markdown</strong></summary>
&nbsp;

*   **Trình soạn thảo:** Trình soạn cú pháp Markdown kèm xem trước theo thời gian thực.
*   **Lưu trữ:** Lưu thành các tệp `.md` trong thư mục dữ liệu người dùng.
*   **Tính năng riêng:**
    *   **Sơ đồ Mermaid:** Hỗ trợ gốc vẽ sơ đồ (lưu đồ, biểu đồ tuần tự, v.v.) qua khối code ` ```mermaid `.
    *   **Công thức toán học:** Hỗ trợ LaTeX đầy đủ cho biểu thức toán học với cú pháp `$ inline $` và `$$ block $$`.
    *   **Tính di động cao:** Định dạng Markdown chuẩn tương thích với mọi trình soạn thảo ngoài hoặc trình tạo trang tĩnh.
</details>

<details>
<summary><strong>Danh sách công việc (Task Lists)</strong></summary>
&nbsp;

*   **Công dụng:** Quản lý công việc và dự án bằng các danh sách kiểm tra tương tác.
*   **Quy trình:** Theo dõi tiến độ với các hộp kiểm có thể đánh dấu trực tiếp trong trình soạn thảo hoặc danh sách ghi chú. Thanh tiến độ hiển thị mức độ hoàn thành của mỗi danh sách.
*   **Tùy chọn công việc:** Mỗi công việc có thể gắn hạn hoàn thành kèm giờ tùy chọn, thông báo nhắc việc tự kích hoạt đúng giờ, mức ưu tiên (cao, trung bình hoặc thấp, hiển thị lần lượt màu đỏ, cam hoặc xanh lá), và có thể chuyển sang danh sách khác.
*   **Trang Tasks:** Một trang Tasks riêng mở từ thanh biểu tượng bên trái sẽ gom về một chỗ toàn bộ công việc từ mọi danh sách công việc và, tùy chọn, cả các hộp kiểm nằm trong ghi chú thường. Trang này có bộ lọc trạng thái (cần làm, ưu tiên cao/trung bình/thấp, quá hạn, có hạn chót, đã xong), bộ lọc văn bản và chế độ xem lịch cho các công việc có ngày đến hạn. Bạn có thể ẩn một danh sách công việc hoặc các hộp kiểm của một ghi chú khỏi trang bằng nút hình con mắt ở tiêu đề, rồi hiện lại bằng **Show hidden lists**. Lựa chọn được lưu vào tài khoản nên đồng bộ theo bạn trên mọi thiết bị.
*   **Cộng tác công khai:** Danh sách công việc có thể chia sẻ qua URL công khai. Nếu cấp quyền chỉnh sửa, người cộng tác bên ngoài có thể đánh dấu hoàn thành các mục mà không cần tài khoản Poznote.
</details>

<details>
<summary><strong>Lối tắt (Shortcuts)</strong></summary>
&nbsp;

*   **Chức năng:** Tạo tham chiếu tới một ghi chú đang có ở một vị trí khác.
*   **Tình huống sử dụng:** Cho phép một ghi chú xuất hiện đồng thời ở hai nơi khác nhau. Ví dụ, ghi chú gốc nằm trong thư mục phân loại tài liệu trong khi lối tắt của nó xuất hiện trên bảng Kanban để theo dõi công việc hằng ngày.
</details>

<details>
<summary><strong>Mẫu ghi chú (Templates)</strong></summary>
&nbsp;

*   **Chức năng:** Tái sử dụng nội dung viết sẵn để chuẩn hóa tài liệu, từ một ghi chú hoàn chỉnh đến một đoạn mẫu ngắn.
*   **Thiết lập:** Đặt các ghi chú muốn tái sử dụng vào một thư mục tên `Templates` (có thể chia thêm thư mục con). Một workspace tên `Templates` cũng hoạt động tương tự và xuất hiện ở mọi workspace khác. Tên này cũng được nhận diện theo ngôn ngữ giao diện (`Modèles`, `Vorlagen`, `Plantillas`, `Modelos`, `Шаблоны`, `模板`, `템플릿`, `テンプレート`, `Plantilles`).
*   **Chèn vào ghi chú:** Gõ `/template` (hoặc `/` kèm tiêu đề mẫu) trong ghi chú rich text hoặc Markdown rồi chọn mẫu: nội dung mẫu sẽ được dán tại vị trí con trỏ và tự động chuyển đổi định dạng nếu mẫu khác loại với ghi chú đang mở.
*   **Tạo ghi chú mới từ mẫu:** Nhân bản ghi chú mẫu, hoặc nhân bản cả thư mục `Templates` để khởi đầu một dự án với cấu trúc thư mục dựng sẵn.
</details>

<details>
<summary><strong>Ghi chú hằng ngày (Nhật ký / Diary)</strong></summary>
&nbsp;

*   **Công dụng:** Viết mỗi ngày một ghi chú theo kiểu nhật ký từ bảng Diary riêng.
*   **Quy trình:** Nút "Create today's entry" tạo ghi chú cho ngày hôm nay (sau khi đã tạo, nút đổi thành "Go to today's entry"), đặt tiêu đề theo ngày hiện tại và tự động lưu vào cấu trúc thư mục `Diary/YYYY/MM`.
*   **Ngày khác:** Nút lịch cạnh cụm nút chuyển chế độ xem cho phép chọn bất kỳ ngày nào, kể cả trên điện thoại. Những ngày đã có bài viết được đánh dấu chấm; chọn vào sẽ mở bài của ngày đó, chọn ngày chưa có sẽ tạo bài mới cho ngày đó.
*   **Chế độ xem Bảng (Board View):** Các mục được hiển thị dạng thẻ gom theo tháng, mới nhất lên đầu, kèm bộ lọc để tìm nhanh các ngày cũ.
*   **Chế độ xem Nhật ký (Journal View):** Nút cuộn giấy cạnh cụm nút chuyển chế độ xem chuyển sang một cột đọc liên tục: hiển thị mọi bài viết với toàn bộ nội dung, mới nhất lên đầu, tải dần khi cuộn. Bộ lọc cũng hoạt động ở đây. Nhấp vào bài viết hoặc biểu tượng cây bút để sửa ngay tại chỗ; thay đổi tự lưu khi bạn gõ. Nút tag cạnh cây bút biến phần thẻ của bài viết thành trình chỉnh sửa: thêm hoặc gỡ tag mà không cần mở riêng ghi chú.
*   **Định dạng:** Bài mới được tạo dạng rich text hoặc Markdown tùy theo thiết lập "Diary entry format" trong **Settings > Diary**.
*   **Mẫu nhật ký:** Để mỗi bài mới đều khởi đầu với cùng một khung nội dung (tiêu đề, hộp kiểm...), hãy đặt ghi chú mẫu đó trong thư mục tên `Templates` của workspace rồi chọn nó ở mục "Diary entry template" trong **Settings > Diary**. Mỗi workspace có mẫu riêng chọn từ chính các ghi chú của workspace đó: mở Settings từ bên trong workspace muốn thiết lập. Mẫu sẽ tự chuyển đổi nếu khác định dạng với mục nhật ký.
</details>

## Lịch sử chỉnh sửa (Revisions)

Revisions lưu giữ các phiên bản trước đây của nội dung ghi chú kèm tiêu đề và tag, giúp bạn đối chiếu với bản hiện tại và khôi phục về trạng thái trước đó. Biểu tượng lịch sử trên thanh công cụ ghi chú sẽ mở trang **Revisions** của ghi chú đó.

<details>
<summary><strong>Trang Revisions</strong></summary>
<br>

*   **Lịch sử (History):** cột bên trái liệt kê các phiên bản của ghi chú gom theo ngày, mỗi bản được gắn nhãn Automatic, Manual, Before AI edit hoặc Before MCP edit. Nhãn "Current" đánh dấu các bản giống hệt ghi chú hiện tại, còn "No change" đánh dấu các bản giống hệt bản liền trước đó. Cả hai nhãn này đều xét cả tiêu đề và tag.
*   **Nội dung (Content):** trang mặc định mở ở tab này, hiển thị bản sửa đổi đang chọn dưới dạng đã kết xuất. Với ghi chú Markdown, có nút chuyển Preview/Source ngay cạnh các tab.
*   **Thay đổi (Changes):** tab thứ hai hiển thị diff từng dòng, tô sáng các từ thay đổi, so với phiên bản hiện tại, phiên bản liền trước hoặc bất kỳ phiên bản nào khác. Diff có thể xem dạng Unified hoặc Side by side, các dòng không đổi được thu gọn (nhấp để mở rộng), nút thay đổi trước/sau nhảy nhanh giữa các điểm sửa, kèm bộ đếm số dòng thêm và xóa. Ghi chú Markdown được so sánh trên mã nguồn. Ghi chú rich-text được so sánh trên văn bản thuần, nên riêng việc đổi định dạng chữ sẽ không hiện trong diff. Phía trên phần diff, tab hiển thị thay đổi tiêu đề (cũ → mới) và các tag đã thêm hoặc gỡ giữa hai phiên bản đang so sánh.
*   **Thao tác (Actions):** menu "Actions" chứa "Restore this revision", "Save a revision", "Copy content" và "Delete this revision". "Save a revision" lưu ngay nội dung hiện tại, các mục còn lại tác động lên phiên bản đang chọn.
*   **Khôi phục:** việc khôi phục trả lại cho ghi chú đúng nội dung, tiêu đề và tag của phiên bản đã chọn. Trạng thái bị ghi đè sẽ không tự động được lưu: nếu thấy quan trọng, hãy lưu một bản trước ("Save a revision" trong menu Actions, hoặc **Ctrl + Alt + S**). Tiêu đề khi khôi phục tuân theo quy tắc đặt tên: nếu một ghi chú khác trong cùng thư mục đã có tiêu đề đó, hậu tố dạng "(1)" sẽ được thêm vào. Các phiên bản lưu từ thời kỳ chưa ghi nhận tag sẽ không chứa tag và giữ nguyên các tag hiện tại của ghi chú.

</details>

<details>
<summary><strong>Cách Revisions hoạt động</strong></summary>
<br>

*   **Tự động (Automatic):** Poznote lưu một phiên bản khi ghi chú bị chỉnh sửa, chứ không phải khi mở xem. Mỗi khi có thay đổi đối với nội dung, tiêu đề hoặc tag được lưu lại (tự lưu của trình soạn thảo, đánh dấu công việc, lưu hình vẽ, gọi REST API, sửa qua liên kết chia sẻ công khai), Poznote trước hết giữ lại trạng thái ngay trước thay đổi đó, trừ phi đã có một phiên bản của ghi chú này được chụp trong vòng 10 phút gần nhất. Nhờ vậy một phiên bản luôn giữ trạng thái *trước* một thay đổi, và một phiên làm việc chỉ sinh tối đa một phiên bản tự động mỗi 10 phút. Mở hoặc đọc ghi chú không bao giờ tạo phiên bản. Không lưu gì đối với ghi chú rỗng, hoặc khi phiên bản mới nhất đã khớp hoàn toàn nội dung, tiêu đề và tag hiện tại, nên lịch sử không bị trùng lặp. Các phiên bản này mang nhãn "Automatic" trong lịch sử, tương tự như các phiên bản mà những bản Poznote cũ hơn tạo lúc mở ghi chú: chúng tuân theo cùng quy tắc.
*   **Ví dụ:** bạn sửa ghi chú từ 9:00 đến 9:35. Lịch sử sẽ ghi lại các mốc vào khoảng 9:00 (trạng thái trước khi bạn chạm vào), 9:10, 9:20 và 9:30. Đến 14:00 bạn quay lại sửa một từ: mốc 14:00 lưu lại trạng thái ghi chú đúng như lúc bạn rời đi vào 9:35.
*   **Bạn có thể quay về mốc nào:** trạng thái bạn để lại khi kết thúc một phiên làm việc không được lưu thành phiên bản ngay lúc đó, vì bản thân nó chính là ghi chú hiện tại. Nó sẽ được chụp lại ngay ở thay đổi đầu tiên của phiên làm việc tiếp theo, dù cách đó bao lâu. Vì thế bạn luôn có thể quay về trạng thái trước khi bắt đầu sửa hôm nay, và trong một phiên dài, quay về các mốc cách nhau tối đa khoảng 10 phút. Trạng thái mới nhất luôn là chính ghi chú hiện tại: so sánh bất kỳ phiên bản nào với "Current version" để xem những gì đã đổi từ mốc đó đến nay.
*   **Thời gian giữ các phiên bản tự động:** mọi phiên bản tự động trong 24 giờ gần nhất đều được giữ lại. Quá 24 giờ, chỉ giữ lại phiên bản tự động mới nhất của mỗi ngày, mặc định trong 30 ngày. Số ngày này chỉnh được tại **Settings > Revisions** (từ 1 đến 30). Nếu trước đây bạn từng đổi thiết lập này ở bản cũ (khi nó đếm số lượng phiên bản), giá trị cũ của bạn được giữ nguyên và nay tính theo số ngày.
*   **Thủ công (Manual):** "Save a revision" tạo thêm một phiên bản bất kỳ lúc nào, tương tự tổ hợp phím **Ctrl + Alt + S** (Cmd + Alt + S trên Mac) khi đang mở ghi chú. Các phiên bản thủ công không giới hạn số lượng và không bị tỉa bớt theo ngày: chúng chỉ biến mất khi hết hạn sau 30 ngày.
*   **Trước khi AI chỉnh sửa:** một phiên bản được tự động lưu ngay trước khi [Trợ lý AI](#trợ-lý-ai) hoặc [MCP server](#mcp-server) thay đổi nội dung ghi chú, ngay cả khi vừa có một phiên bản tự động cách đó chưa đầy 10 phút, nhờ vậy một lần viết lại bị hỏng có thể hoàn tác chỉ bằng một cú nhấp chuột. Các phiên bản này mang nhãn "Before AI edit" hoặc "Before MCP edit" trong lịch sử và được bỏ qua nếu phiên bản mới nhất đã có cùng nội dung, tiêu đề và tag.
*   **Phiên bản an toàn (Safety revisions):** hai loại "Before AI edit" và "Before MCP edit" dùng chung một giới hạn: giữ tối đa 20 bản gần nhất cho mỗi ghi chú, con số bạn có thể đổi trong **Settings → Revisions** (1 đến 200) nếu instance của bạn hay sửa nhiều ghi chú qua AI hoặc MCP.
*   **Hết hạn:** mọi phiên bản, bất kể loại nào, sẽ bị xóa sau 30 ngày kể từ lúc lưu. Bạn cũng có thể xóa thủ công từ trang Revisions.
*   **Tệp đính kèm và hình ảnh:** phiên bản chỉ lưu văn bản, tiêu đề và tag của ghi chú chứ không sao chép tệp. Tệp đính kèm không bao giờ bị nhân bản, nên một tệp được nhiều phiên bản tham chiếu chỉ tồn tại một bản trên ổ đĩa. Tệp bị gỡ khỏi một ghi chú vẫn nằm trên đĩa (ẩn khỏi ghi chú) chừng nào còn ít nhất một phiên bản chứa nó, nhờ đó khôi phục phiên bản đó sẽ lấy lại được tệp. Tệp chỉ bị xóa vĩnh viễn khi phiên bản cuối cùng tham chiếu tới nó hết hạn hoặc bị xóa, hoặc khi ghi chú bị xóa vĩnh viễn. Vì vậy giữ nhiều phiên bản không làm nhân đôi dung lượng tệp đính kèm, mà chỉ giữ lại các tệp đã gỡ lâu hơn một chút, tối đa 30 ngày.
*   **API và MCP:** tài liệu [REST API](API-REST.md#snapshots) và các công cụ [MCP server](#mcp-server) vẫn gọi các phiên bản này là "snapshots" (`/notes/{id}/snapshots`, `list_snapshots`, `get_snapshot`, `restore_snapshot`).

</details>

## Cá nhân hóa

Poznote cung cấp nhiều tùy chọn cá nhân hóa tích hợp sẵn ngay trong ứng dụng mà không cần chỉnh sửa tệp cấu hình.

<details>
<summary><strong>Hiển thị, Markdown và các cài đặt giao diện khác</strong></summary>
<br>

Trang Cài đặt được chia thành các mục, mỗi mục chứa các thẻ cấu hình tương ứng:

- **Display:** phông chữ ứng dụng, kích thước chữ và biểu tượng, bảng màu hiển thị khi tô màu ghi chú, tiêu đề trang đăng nhập.
- **Element visibility:** ẩn các thành phần giao diện bạn không dùng tới, xem bên dưới.
- **Sidebar:** thứ tự và màu sắc các nút trên thanh biểu tượng bên trái (nhấp chuột phải vào một nút cũng mở bộ chọn màu), bộ lọc độ tuổi ghi chú, vị trí hiển thị các ghi chú không thuộc thư mục nào, làm mờ các thư mục bạn không làm việc tới.
- **Note content:** độ rộng ghi chú, xem trước tệp đính kèm, viền ảnh mặc định, vị trí chèn công việc mới, khối code, tệp đính kèm và backlink ở cuối ghi chú, kiểm tra chính tả, phím tắt mở menu lệnh, vị trí thanh công cụ định dạng.
- **Markdown:** chế độ xem mặc định, các chế độ mà nút chuyển chế độ xem của ghi chú xoay vòng qua (live preview, rich text, split), phông chữ trình soạn thảo, Markdown đóng khung và tô màu.
- **Diary:** định dạng, mẫu và định dạng ngày của bài nhật ký mới.
- **Sync & history:** Git Sync, ghi chú ngoại tuyến và thời gian lưu giữ lịch sử chỉnh sửa (một phiên bản tự động mỗi ngày sau 24 giờ đầu, cùng số phiên bản an toàn mỗi ghi chú).
- **My Account:** ngôn ngữ giao diện, múi giờ và định dạng ngày giờ.

Giao diện màu (theme) không nằm thành thẻ ở đây: nút ở cuối thanh biểu tượng bên trái sẽ xoay vòng qua các theme, và quản trị viên chọn danh sách theme được xoay vòng đó tại **Settings > Admin Tools > Theme list**.

</details>

<details>
<summary><strong>Ảnh nền Workspace</strong></summary>
<br>

Bạn có thể đặt ảnh nền riêng cho từng workspace: mở **Settings > Workspaces** và dùng thao tác **Background** trên dòng của workspace để tải ảnh lên và chỉnh độ mờ, giúp mỗi workspace mang dấu ấn thị giác riêng.

</details>

<details>
<summary><strong>Hiển thị thành phần (Element Visibility)</strong></summary>
<br>

Poznote cho phép làm gọn giao diện bằng cách ẩn đi những thành phần bạn không sử dụng.

Cấu hình tại **Settings > Element visibility**.

- **Kiểm soát chi tiết:** Bật/tắt hiển thị cho từng thẻ trang chủ, nút trên thanh công cụ, mục trong menu dấu gạch chéo `/`, v.v. Nhãn ngày tạo trên ghi chú (**Show creation date**) và số lượng ghi chú cạnh mỗi thư mục (**Show folder note counts**) cũng được bật tắt tại đây.
- **Theo từng người dùng:** Mỗi người dùng có thể có bố cục giao diện riêng.
- **Quản trị viên:** Cùng hộp thoại đó có thêm cột thứ hai là "Users" cạnh cột "Me" của riêng quản trị viên, dùng để ẩn thành phần cho toàn bộ người dùng của instance (trừ các quản trị viên).
- **Tìm kiếm nhanh:** Dễ dàng tìm thấy thành phần muốn ẩn bằng ô lọc trong hộp thoại cấu hình.

</details>

<details>
<summary><strong>Phông chữ tùy chỉnh (Custom Fonts)</strong></summary>
<br>

Poznote đi kèm sẵn phông Inter và có thể dùng các phông chữ cài trên thiết bị của bạn. Để dùng bất kỳ phông nào khác, chẳng hạn một bộ phông từ Google Fonts, quản trị viên chỉ cần tải các tệp phông lên một lần để mọi người dùng đều chọn được.

Tải lên tại **Settings > Admin Tools > Custom fonts**, sau đó chọn phông tại **Settings > Display > App font** hoặc **Settings > Markdown > Markdown editor font**.

Lưu ý:

- Hỗ trợ các định dạng WOFF2, WOFF, TTF và OTF, tối đa 10 MB mỗi tệp.
- Một họ phông (family) gồm nhiều tệp (regular, bold, italic...) hoặc một tệp variable font duy nhất. Hãy chọn toàn bộ các tệp của một họ phông trong cùng một lần tải lên để chúng được gom dưới cùng một tên họ phông.
- Các phông chữ được phục vụ trực tiếp từ chính instance của bạn, không tải gì từ Google hay bên thứ ba. Trước tiên hãy tải bộ phông về từ [Google Fonts](https://fonts.google.com) (**Get font > Download all**) hoặc [google-webfonts-helper](https://gwfh.mranftl.com/fonts).
- Một họ phông thiếu tệp in đậm (bold) sẽ giữ phông mặc định cho chữ đậm và tiêu đề, nên hãy tải kèm cả tệp bold.
- Các tệp được lưu trong `data/fonts/` (nằm trong Docker volume của bạn), nên không bị mất khi cập nhật image. Các tệp chép thủ công vào đó sẽ tự được nhận diện khi mở hộp thoại **Custom fonts**.
- Mỗi người dùng tự chọn phông riêng cho mình. Xóa một họ phông sẽ đưa những người đang chọn nó trở về phông mặc định.
- Chỉ quản trị viên mới có quyền tải lên hoặc xóa phông chữ.

</details>

<details>
<summary><strong>Ghi đè CSS tùy chỉnh (Custom CSS Overrides)</strong></summary>
<br>

Nếu muốn tinh chỉnh phông chữ, khoảng cách hay các chi tiết giao diện vượt ngoài các tùy chọn có sẵn, bạn có thể tải lên các stylesheet bổ sung để áp dụng lên mọi trang HTML cho toàn bộ người dùng.

Cấu hình tại **Settings > Admin Tools > Custom CSS path**.

Lưu ý:

- Nhấp **Upload CSS file** để chọn tệp `.css` từ máy tính của bạn.
- Mọi tệp đã tải lên đều được lưu giữ, nên bạn có thể lưu nhiều theme khác nhau và chuyển đổi qua lại mà không cần tải lại.
- Hộp thoại liệt kê các tệp đang lưu: chọn tệp muốn áp dụng cho mọi người dùng, hoặc **No custom CSS** để quay về giao diện mặc định, rồi nhấn **Save**.
- Tải lên một tệp trùng tên với tệp đã lưu sẽ thay thế theme đó.
- Các tệp được lưu trong `data/css/` (nằm trong Docker volume của bạn), nên tồn tại xuyên suốt các lần cập nhật image.
- Nhấp biểu tượng thùng rác cạnh một theme để xóa tệp đó khỏi volume.
- Poznote tự động gắn tham số `v=` để tránh lỗi cache trình duyệt.
- Stylesheet được chèn gần cuối thẻ `<head>`, nên có thể ghi đè các quy tắc kiểu mặc định của ứng dụng.
- Chỉ quản trị viên mới có thể tải lên, áp dụng hoặc xóa tệp CSS tùy chỉnh.

### Danh sách theme

**Settings > Admin Tools > Theme list** quy định những theme nào nút đổi theme ở đáy thanh biểu tượng sẽ duyệt qua: mỗi cú nhấp chuột chuyển qua một theme theo đúng thứ tự hiển thị.

- Đánh dấu các theme có sẵn mà bạn muốn giữ lại, và bỏ chọn những theme không ai dùng.
- Đánh dấu một tệp CSS đã tải lên để đưa nó thành một theme riêng. Nó sẽ có biểu tượng bảng màu cùng tên tệp.
- Dùng các mũi tên để sắp xếp thứ tự xoay vòng của nút đổi theme.
- Một theme tùy chỉnh phủ lên nền sáng hoặc nền tối mà bản thân tệp CSS không tự khai báo được: hãy chọn loại nền ngay cạnh tên tệp. Giá trị đó sẽ được gán cho `data-theme`, nên một stylesheet viết cho chế độ tối cần chọn **Dark** tại đây.
- Danh sách này là cài đặt toàn cục nên mọi người đều duyệt qua cùng một tập theme; còn việc đang dùng theme nào vẫn là lựa chọn riêng của từng người dùng.
- Ai đang dùng một theme mà bạn vừa gỡ khỏi danh sách sẽ được chuyển ngay về theme đầu tiên trong danh sách.
- Chọn một theme CSS tùy chỉnh sẽ chỉ nạp tệp đó cho riêng người dùng đang chọn, thay thế cho stylesheet áp dụng toàn instance.
- Xóa một tệp CSS cũng sẽ xóa nó khỏi danh sách này.
- Nếu danh sách chỉ có duy nhất một theme thì không có gì để xoay vòng, nên nút đổi theme sẽ mở danh sách này đối với quản trị viên và không làm gì đối với các người dùng khác.

**Trước khi tự viết CSS**, hãy kiểm tra xem các theme tích hợp sẵn đã đáp ứng nhu cầu của bạn chưa: nút theme ở đáy thanh biểu tượng xoay vòng qua Light, Dark, Black, Lavender, Sepia và Terminal.

### Ví dụ

Màu sắc, khoảng cách, bo góc và độ đậm chữ đều là các design token, nên đa số thay đổi chỉ cần ghi đè một danh sách ngắn các biến thay vì phải vật lộn với CSS selector. Danh sách đầy đủ nằm trong `src/public/css/tokens.css`.

**Đổi màu nhấn (accent colour)**

```css
:root {
    --pz-accent: #d6336c;
    --pz-accent-hover: #a61e4d;
    --pz-accent-rgb: 214, 51, 108;   /* same colour, channels only, used for tints */
}
html[data-theme='dark'] {
    --pz-accent-text: #f783ac;       /* lighter, because it sits on a dark ground */
}
```

Có hai token thay vì một vì màu *nền tô* và màu *nhãn chữ* không thể dùng chung một sắc độ: `--pz-accent` tô nền nút bấm, còn `--pz-accent-text` là màu nhấn dùng cho chữ, biểu tượng và đường viền. Ở theme sáng nó tự bám theo `--pz-accent`; trên nền tối cần giá trị sáng hơn. Mọi token đều giữ nguyên tên `--pz-*` trên tất cả các theme, chỉ giá trị thay đổi. Các tên `--dm-*` của stylesheet đời cũ vẫn tiếp tục hoạt động.

**Đổi màu biểu tượng trên thanh công cụ ghi chú**

```css
.note-edit-toolbar .toolbar-btn i,
.note-edit-toolbar .toolbar-btn [class*="lucide-"],
.note-edit-toolbar .toolbar-btn:hover i,
.note-edit-toolbar .toolbar-btn:hover [class*="lucide-"] {
    color: #e5322d !important;
}
```

Các biểu tượng là CSS mask được tô bằng `background-color: currentColor`, nên chỉ cần chỉnh `color` là đủ. Cần thêm `!important` ở đây vì một vài biểu tượng vốn đã mang màu trạng thái riêng (ngôi sao khi ghi chú được yêu thích, biểu tượng chia sẻ khi đã xuất bản, kẹp giấy khi có tệp đính kèm).

Không cần viết CSS nếu chỉ muốn đổi màu từng biểu tượng riêng lẻ: nhấp chuột phải vào biểu tượng đó trên thanh công cụ ghi chú hoặc thanh biểu tượng bên trái rồi chọn màu. Các màu đó được lưu riêng cho từng người dùng và giữ nguyên các màu trạng thái nói trên.

**Làm ấm toàn bộ giao diện**

```css
:root {
    --pz-bg: #f6ecd8;          /* page and note background */
    --pz-surface: #efe0c4;     /* panels, cards, menus */
    --pz-text: #3b2c1a;
    --pz-border: #d4bd94;
}
```

**Viết một theme hoàn chỉnh**

Chỉ cần ghi đè các token trên `:root` cho nền sáng và trên `:root[data-theme='dark']` cho nền tối, không cần thêm gì khác. Tệp `src/public/css/README.md` mô tả chi tiết từng token kèm ví dụ hoàn chỉnh; các theme tích hợp sẵn như Lavender, Sepia và Terminal trong `src/public/css/tokens.css` cũng được viết theo đúng cách đó.

</details>

## Đa người dùng

> Đừng nhầm lẫn với tính năng [Chạy nhiều instance](#chạy-nhiều-instance).

Poznote hỗ trợ đa người dùng: mỗi hồ sơ có ghi chú, workspace, tag, thư mục, tệp đính kèm và cài đặt riêng, và đăng nhập bằng tên đăng nhập hoặc địa chỉ email cùng mật khẩu của riêng mình.

- **Quản lý người dùng**: quản trị viên tạo, vô hiệu hóa và quản lý các hồ sơ tại **Settings > Admin Tools > User Management**, đồng thời có thể cấp cho một người dùng quyền truy cập vào tài khoản của người khác mà không chuyển quyền sở hữu.
- **Chia sẻ và cộng tác**: có thể chia sẻ workspace, ghi chú và thư mục với những người dùng khác trên cùng instance, xem [Chia sẻ và cộng tác](#chia-sẻ-và-cộng-tác).
- **Cô lập người thuê (Chế độ SaaS)**: quản trị viên có thể chặn người dùng thường nhìn thấy các tài khoản khác trên instance, chặn chia sẻ với họ hoặc chặn đăng ký webhook cá nhân. Để tắt toàn bộ tùy chọn này nếu đây là instance dùng chung cho gia đình hoặc nhóm nhỏ.
- **Truy cập mạng cục bộ**: người dùng không phải quản trị viên chỉ có thể kết nối webhook, Git Sync và server AI, chuyển giọng nói hoặc MCP riêng của họ tới các host trên Internet công khai, ngoại trừ những host nội bộ được quản trị viên cho phép, xem [Truy cập mạng cục bộ cho người dùng thường](#local-network-access).

<a id="local-network-access"></a>
<details>
<summary><strong>Truy cập mạng cục bộ cho người dùng thường</strong></summary>
<br>

Một số tính năng khiến chính server Poznote kết nối tới địa chỉ do người dùng nhập vào: webhook, Git Sync, cũng như server AI, server chuyển giọng nói hoặc MCP server riêng của họ. Yêu cầu kết nối xuất phát từ server chứ không phải từ trình duyệt của người dùng. Nếu không giới hạn, bất kỳ tài khoản nào cũng có thể lợi dụng Poznote để chạm tới chính máy chủ, các Docker container khác, mạng nội bộ của bạn hoặc dịch vụ metadata đám mây vốn bình thường tài khoản đó không tiếp cận được.

Vì vậy quy tắc phụ thuộc vào việc ai là người nhập địa chỉ:

- **Quản trị viên** không bị giới hạn: họ vốn đã kiểm soát server.
- **Người dùng khác** chỉ được dùng các host trên Internet công khai. Mọi địa chỉ cục bộ hoặc nội bộ đều bị từ chối: `localhost` và `127.0.0.1`, `10.x.x.x`, `172.16.x.x` đến `172.31.x.x`, `192.168.x.x`, `169.254.x.x`, các địa chỉ IPv6 nội bộ (`fc00::/7`, `fe80::/10`), và bất kỳ tên miền nào phân giải về một trong các địa chỉ đó, chẳng hạn tên của một Docker service khác.

Các cấu hình do quản trị viên thiết lập cho toàn instance (Trợ lý AI, Chuyển giọng nói, Admin Webhooks, S3, OIDC, SMTP) không bị ảnh hưởng.

Trên một instance gia đình hoặc đội nhóm, người dùng có thể cần kết nối tới một server nằm trong mạng nội bộ của bạn, ví dụ server Ollama cho AI cá nhân hoặc n8n cho webhook. Hãy liệt kê các host đó tại **Settings > Admin Tools > Integrations > Local network access**, mỗi dòng một mục:

| Mục nhập | Phạm vi cho phép |
|---|---|
| `ollama` hoặc `ollama.lan` | tên host này, bất kể nó trỏ tới địa chỉ nào (tên Docker service cũng dùng được) |
| `*.home.arpa` | mọi tên host thuộc tên miền này |
| `192.168.1.20` | đúng địa chỉ này |
| `192.168.1.0/24` | mọi địa chỉ trong dải mạng này (IPv6 cũng hỗ trợ, ví dụ `fd00::/8`) |

Mỗi mục cho phép mọi cổng của host đó. Các mục không hợp lệ sẽ bị từ chối khi lưu kèm danh sách những mục cần sửa. Thẻ hiển thị **Public only** khi danh sách trống, và hiển thị số mục khi đã có danh sách.

Cần lưu ý:

- Tên host trong danh sách phải phân giải được từ bên trong container Poznote, chứ không chỉ từ máy tính của bạn. Một cái tên mà chỉ máy bạn hoặc router biết thì Poznote không thể phân giải được và sẽ từ chối như mọi tên không xác định khác: hãy nhập địa chỉ IP hoặc dải mạng của nó thay thế.
- Địa chỉ được kiểm tra lại ở mọi lần kết nối chứ không chỉ lúc lưu: xóa một mục sẽ có hiệu lực ngay lập tức, và một tên miền về sau đổi sang trỏ về địa chỉ nội bộ cũng sẽ bị từ chối.
- Đối với người dùng không phải quản trị viên, Poznote không đi theo chuyển hướng (redirect), trừ tính năng Git Sync vốn tự kiểm tra lại từng bước chuyển hướng.

</details>

<details>
<summary><strong>Bố cục dữ liệu trên đĩa</strong></summary>
<br>

Poznote dùng một cơ sở dữ liệu chủ (`data/master.db`) cho dữ liệu điều phối dùng chung, cùng các cơ sở dữ liệu và thư mục tệp tách biệt cho từng người dùng để chứa nội dung ghi chú thực tế.

```
data/
├── master.db                    # Hồ sơ, cài đặt toàn cục, liên kết chia sẻ, quyền truy cập tài khoản, khóa chỉnh sửa
├── css/                         # Tệp CSS tùy chỉnh do quản trị viên tải lên
├── fonts/                       # Phông chữ tùy chỉnh do quản trị viên tải lên
├── backups/                     # Bản sao lưu cục bộ định kỳ, mỗi user ID một thư mục
└── users/
    ├── 1/                       # User ID 1 (quản trị viên mặc định)
    │   ├── database/poznote.db  # Cơ sở dữ liệu ghi chú của người dùng
    │   ├── entries/             # Tệp ghi chú của người dùng (HTML/MD)
    │   ├── attachments/         # Tệp đính kèm của người dùng
    │   ├── snapshots/           # Các phiên bản trước của ghi chú (revisions)
    │   ├── backgrounds/         # Ảnh nền workspace
    │   └── backups/             # Tệp nén sao lưu chuẩn bị cho tải xuống
    ├── 2/                       # User ID 2
    └── ...
```

</details>

## Chia sẻ và cộng tác

Poznote mang lại nhiều cách để làm việc cùng những người dùng khác trên cùng instance, mỗi người vẫn giữ nguyên tài khoản riêng của mình. Để có không gian làm việc chung (gia đình, bạn bè, một nhóm), hãy chia sẻ một workspace.

- **Chia sẻ một workspace**: chủ sở hữu mở **Settings > Workspaces** rồi nhấp **Share** trên dòng của workspace (biểu tượng chia sẻ, hoặc mục đầu tiên trong menu **...**), sau đó chọn người dùng. Những người đó sẽ thấy workspace trong menu workspace của họ dưới mục **Shared with me**, và có thể chỉnh sửa ghi chú, thư mục bằng trình soạn thảo đầy đủ với quyền ghi như chủ sở hữu. Cạnh mỗi tên, chủ sở hữu có thể chọn **Read only** thay cho **Can edit**: khi đó người được chia sẻ chỉ đọc được ghi chú, theo dõi thay đổi trực tiếp, mở tệp đính kèm và xuất ghi chú, còn mọi thao tác ghi đều bị từ chối kể cả qua trợ lý AI. Các trang Dashboard, Tasks, Folders, Diary, Speed dial và Revisions (vốn cho sửa trực tiếp) sẽ không khả dụng với họ. Các workspace khác, cài đặt, thùng rác và bản sao lưu của chủ sở hữu vẫn hoàn toàn riêng tư. Trong workspace được chia sẻ, gõ `@username` trong ghi chú sẽ nhắc tới người đó và hiển thị trên trang **Mentions** của họ. Khi instance có cấu hình gửi email (SMTP), mỗi thành viên có thể bật **Settings > Workspaces > Shared workspace emails** để nhận danh sách các ghi chú người khác tạo, sửa hoặc xóa trong workspace đó vài phút sau khi thay đổi diễn ra, hoặc dưới dạng email tổng hợp gửi hằng ngày lúc 8:00 hoặc thứ Hai hằng tuần lúc 8:00 (theo múi giờ của từng thành viên).
- **Chia sẻ một ghi chú hoặc thư mục**: nút **Share** trong menu của ghi chú hoặc thư mục sẽ tạo liên kết chỉ dẫn tới riêng ghi chú hoặc thư mục đó. Liên kết có thể để công khai, bảo vệ bằng mật khẩu, hoặc giới hạn cho một số người dùng trên instance (họ cần đăng nhập để mở), và có thể cấp quyền chỉnh sửa. Trang **Shares** trên thanh biểu tượng liệt kê các mục bạn đã chia sẻ, và những gì người khác chia sẻ với bạn nằm dưới mục **Shared with me**.
- **Cấp quyền truy cập toàn bộ tài khoản**: quản trị viên có thể cho phép một người dùng mở tài khoản của người dùng khác tại **Settings > Admin Tools > User Management** mà không cần chuyển quyền sở hữu. Người dùng chuyển qua lại tài khoản từ mục **Accounts** trong menu workspace.
- **Cùng sửa một ghi chú**: tại một thời điểm chỉ có một người sửa. Ghi chú chỉ đang mở để đọc sẽ không khóa bất kỳ ai: khóa chỉ được giữ từ thao tác sửa đầu tiên và được giải phóng sau 15 giây không có thay đổi. Khi ghi chú đang bị khóa, biểu ngữ chỉ-đọc sẽ hiện nút cho phép **chiếm quyền sửa (take over)**: màn hình của người sửa trước đó chuyển về chỉ-đọc còn các thay đổi chưa lưu của họ vẫn nằm nguyên trong trình duyệt, sẵn sàng gợi ý áp dụng lại sau khi ghi chú hết khóa. Một ghi chú đang mở cũng tự động cập nhật các thay đổi từ nơi khác trong vòng vài giây. Đối với ghi chú **Markdown** có thay đổi chưa lưu ở cả hai phía, hai luồng sửa sẽ tự động gộp lại nếu chạm tới các dòng khác nhau, và nếu đè lên nhau sẽ hiện biểu ngữ cho bạn chọn. Ghi chú rich-text không gộp tự động mà bạn chọn giữ lại phiên bản nào. Hãy luôn đặt script và mã nguồn trong khối code có rào (```` ``` ````): mã HTML thô nằm ngoài khối code sẽ bị làm sạch (sanitize) khi lưu, dễ khiến một phép gộp bình thường bị nhận nhầm thành xung đột.

## Speed dial

Chế độ xem Speed dial biến các ghi chú thành một trang các ô liên kết, được thiết kế để làm trang mở đầu cho trình duyệt của bạn.

<p align="center">
  <img src="speed-dial.gif" alt="Minh họa Speed dial" width="100%">
</p>

Gắn tag `speed-dial` cho một ghi chú, hoặc chọn **Add to speed dial** trong menu của ghi chú hoặc thư mục (với thư mục là toàn bộ ghi chú bên trong kể cả thư mục con). Mở chế độ xem này bằng biểu tượng tia sét trên thanh biểu tượng bên trái.

- **Một liên kết hoặc không có liên kết:** ghi chú trở thành một ô bấm để mở liên kết đó, hoặc mở chính ghi chú. Biểu tượng của ô là hình ảnh đầu tiên trong ghi chú, nếu không có thì lấy biểu tượng của trang web, và cuối cùng là chữ cái đầu tiên của tiêu đề.
- **Nhiều liên kết:** ghi chú trở thành một nhóm các ô mang tên ghi chú, mỗi liên kết là một ô. Đường kẻ ngang (`----`) bắt đầu một hàng mới, và liên kết bọc quanh một ảnh sẽ dùng ảnh đó làm biểu tượng: `[![GitHub](https://example.com/icon.png)](https://github.com)`.
- **Tên nhóm:** nhấp chuột trái để mở ghi chú, nhấp chuột phải để đổi màu nhãn của nhóm.
- **Nhiều trang Speed dial:** nút **New speed dial** tạo thêm một trang mới, và các nút viên thuốc (pill) giúp chuyển qua lại giữa chúng (ví dụ Work và Home). Mỗi trang tương ứng với một tag như `speed-dial-Work`, kèm ảnh nền riêng. Nhấp chuột phải vào một pill để đổi tên hoặc xóa: xóa pill vẫn giữ nguyên các ghi chú. Khi đó menu của ghi chú và thư mục sẽ hiển thị **Add to a speed dial** kèm danh sách các speed dial ở cạnh: dấu tick chỉ ra những trang đang chứa mục đó, và nhấp chuột để thêm hoặc gỡ bỏ.
- **Sắp xếp giao diện:** kéo thả các ô và nhóm để di chuyển, đổi kích thước ô bằng nút cạnh bộ lọc. Menu **...** ở góc dưới bên phải dùng để đặt ảnh nền, và nút hình con mắt giúp ẩn đi những phần bạn không cần.
- **Trang mở đầu trình duyệt:** dùng đường dẫn `speed_dial.php?workspace=Name&focus=1` sau địa chỉ Poznote của bạn. Tham số `focus=1` sẽ ẩn luôn cả thanh biểu tượng bên trái.

## Nhật ký hoạt động

Poznote lưu giữ lịch sử các thao tác nhạy cảm thực hiện trên instance để quản trị viên biết chuyện gì đã xảy ra, vào lúc nào và do ai làm: đăng nhập và đăng xuất, thay đổi tài khoản và hạn mức, tạo và chia sẻ workspace, sao lưu và khôi phục, dọn thùng rác và xóa vĩnh viễn, mật khẩu ứng dụng. Trang này nằm ở **Settings > Admin Tools > Activity log**, chỉ dành cho quản trị viên, và biểu tượng trợ giúp ở đầu trang liệt kê mọi thao tác được ghi nhận.

Nhật ký chỉ ghi lại sự kiện thao tác đã diễn ra chứ không ghi nội dung dữ liệu tác động: nội dung ghi chú và mật khẩu không bao giờ bị ghi vào log, và các hoạt động thường ngày như viết ghi chú hay chuyển vào thùng rác cũng được bỏ qua. Các bản ghi mặc định được lưu 90 ngày (có thể chọn 30, 90, 365 ngày hoặc không giới hạn), và có thể xóa sạch ngay trên cùng trang đó.

## Webhooks

Poznote có thể thông báo cho các dịch vụ bên ngoài mỗi khi có sự kiện diễn ra trên instance bằng cách gửi **webhook đi (outgoing webhooks)**: các yêu cầu HTTP POST kèm payload JSON tới những endpoint bạn đăng ký, giúp kết nối Poznote dễ dàng với các công cụ tự động hóa như n8n, Zapier hoặc script tự viết. Quản trị viên đăng ký các sự kiện cấp instance (tài khoản, hạn mức, đăng ký mới) tại **Settings > Admin Tools > Admin Webhooks**, còn mỗi người dùng có thể đăng ký endpoint cho ghi chú và lời nhắc của riêng họ tại **Settings > User Webhooks**.

Các lượt gửi được ký bằng HMAC-SHA256 khi webhook có đặt secret, và nội dung ghi chú không bao giờ bị gửi đi. Mọi loại sự kiện, các trường payload, cách xác minh chữ ký và cơ chế đảm bảo gửi nhận đều được trình bày chi tiết trong **[tài liệu Webhooks](WEBHOOKS.vi.md)**.

## Đồng bộ Git

Poznote hỗ trợ đồng bộ tự động và thủ công với **GitHub**, **GitLab** (gitlab.com hoặc bản tự lưu trữ) hoặc **Forgejo**. Mỗi người dùng tự cấu hình kho lưu trữ riêng một cách độc lập, không có kho chung toàn hệ thống.

Git Sync giao tiếp với REST API của nhà cung cấp qua HTTPS, vì vậy việc xác thực luôn dựa trên token. SSH key không được sử dụng.

<details>
<summary><strong>Cách cấu hình Git Sync</strong></summary>
<br>

**Bước 1: Bật tính năng (quản trị viên, trong Settings > Admin Tools)**

Bật công tắc **Git Sync** trong mục **Admin Tools** của trang Settings. Thao tác này kích hoạt Git Sync trên toàn hệ thống và mở thẻ/cấu hình **Git Sync** cấp người dùng trong **Settings**.

---

**Bước 2: Mỗi người dùng tự cấu hình repo của riêng mình (Settings > Git Sync)**

| Trường | Mô tả |
|---|---|
| Provider | `GitHub`, `GitLab` hoặc `Forgejo` |
| API Base URL | GitHub: tự điền sẵn (chỉ đọc). GitLab: `https://gitlab.com/api/v4`, hoặc URL instance của bạn, ví dụ `https://gitlab.example.com/api/v4`. Forgejo: URL instance của bạn, ví dụ `https://forgejo.example.com/api/v1` |
| Access Token | GitHub PAT (`ghp_...`), GitLab token có quyền `api` (`glpat-...`, personal hoặc project access token) hoặc Forgejo token (Settings > Applications) |
| Repository | Định dạng `owner/repo`. GitLab: đường dẫn đầy đủ của dự án, bao gồm cả subgroup, ví dụ `group/subgroup/project` |
| Branch | Mặc định: `main` |
| Author Name / Email | Dùng làm thông tin tác giả trong commit |

> 🔒 Access token được mã hóa khi lưu trữ bằng AES-256-GCM. Khóa mã hóa được tự động sinh ra và lưu trong `data/.app_secret`.

---

**Đồng bộ tự động**

Khi người dùng bật chế độ này, Poznote sẽ tự động:
- **Pull** khi đăng nhập
- **Push** sau mỗi lần tạo, cập nhật hoặc xóa ghi chú

Thao tác push/pull thủ công cũng có sẵn qua các nút **Push** và **Pull** trên thanh biểu tượng bên trái.

---

**Các workspace được đồng bộ**

Mặc định mọi workspace đều được đồng bộ. Trong **Settings > Git Sync**, từng người dùng có thể giới hạn Git Sync chỉ cho một số workspace nhất định:

- Chỉ ghi chú và tệp đính kèm từ các workspace đã chọn mới được push và pull.
- Lệnh pull không bao giờ đụng tới ghi chú ở các workspace khác.
- Lệnh push sẽ xóa các tệp trên kho lưu trữ nằm ngoài các workspace đã chọn, đảm bảo kho lưu trữ luôn phản ánh chính xác tập workspace đang đồng bộ.
- Các nút Push và Pull ở thanh bên, cơ chế tự động push và lời nhắc pull chỉ xuất hiện khi bạn đang xem một workspace được đồng bộ.

</details>

## Lưu trữ tệp đính kèm trên S3

Mặc định, tệp đính kèm của ghi chú được lưu trên đĩa cục bộ. Quản trị viên có thể chuyển sang lưu chúng trên hệ thống lưu trữ đối tượng tương thích S3 (AWS S3, MinIO, Garage, Cloudflare R2, Backblaze B2, ...). Thiết lập này áp dụng cho mọi người dùng của instance.

<details>
<summary><strong>Cách cấu hình lưu trữ S3</strong></summary>
<br>

Cấu hình tại **Settings > S3 Attachments** (chỉ dành cho quản trị viên).

- **Cấu hình:** Endpoint URL, region, bucket, access key, secret key và kiểu địa chỉ path-style, kèm nút kiểm tra kết nối tích hợp sẵn.
- **Di chuyển dữ liệu (Migration):** Chuyển các tệp đính kèm hiện có qua lại giữa đĩa cục bộ và bucket theo cả hai chiều cho toàn bộ người dùng. Quá trình di chuyển chạy theo từng lô và có thể ngắt giữa chừng rồi chạy tiếp một cách an toàn.
- **Quyền riêng tư:** Tệp đính kèm được lưu dưới đường dẫn `attachments/{user id}/` trong bucket và luôn được phục vụ gián tiếp qua Poznote, vì vậy bucket có thể giữ ở trạng thái riêng tư hoàn toàn.
- **Hạn mức:** Có thể đặt hạn mức lưu trữ S3 cho từng người dùng, và mức sử dụng S3 cũng hiển thị trong phần thống kê lưu trữ của quản trị viên.
- **Sao lưu:** Các bản xuất file ZIP mặc định bao gồm cả tệp đính kèm S3 (tải trực tiếp từ bucket lúc đóng gói), bất kể được tạo từ cửa sổ Backup, qua REST API hay qua sao lưu S3 tự động. Có một tùy chọn trong cửa sổ Backup cho phép loại trừ chúng để tệp nén nhẹ hơn. Nếu không đọc được bucket khi đang tạo gói sao lưu, quá trình xuất sẽ báo lỗi ngay thay vì tạo ra một bản sao lưu thiếu tệp.

Việc khôi phục một bản sao lưu bị thiếu một phần tệp đính kèm mà nó tham chiếu sẽ bị từ chối khi lưu trữ S3 đang bật, vì khôi phục toàn phần sẽ ghi đè nội dung bucket và các tệp thiếu đó sẽ mất. Có hai cách để khôi phục một bản sao lưu như vậy:

- **Cách dễ nhất:** tắt công tắc "Store attachments in S3" (giữ nguyên thông tin kết nối), tiến hành khôi phục bản sao lưu, rồi bật công tắc trở lại. Quá trình khôi phục ở chế độ cục bộ không bao giờ đụng tới bucket, và các tệp đính kèm vẫn còn trên đó sẽ tiếp tục được phục vụ bình thường. Đây cũng là cách đúng đắn trên một server mới cài đặt khi bucket vẫn nguyên vẹn, vì cách xuất tệp đính kèm còn lại đòi hỏi phải có một instance vẫn còn nhận biết các ghi chú đó.
- **Dựng lại một tệp nén hoàn chỉnh:**
  1. Tải **Attachments Export** từ cửa sổ Backup: tệp này chứa toàn bộ tệp đính kèm trong tài khoản của bạn nằm bên trong thư mục `files/`.
  2. Giải nén bản sao lưu, chép các tệp từ `files/` vào thư mục `attachments/` của bản sao lưu, rồi nén lại thành ZIP. Hãy cẩn thận khi nén lại: chọn các thành phần bên trong bản sao lưu (`database/`, `entries/`, `attachments/`, ...) rồi nén phần đã chọn, chứ không nén thư mục cha bọc ngoài chúng. Các thư mục này phải nằm ở tầng gốc của tệp ZIP, nếu không trình khôi phục sẽ báo thiếu `database/poznote_backup.sql`.
  3. Khôi phục tệp ZIP vừa dựng lại như bình thường.

> Git Sync bỏ qua các tệp đính kèm khi tính năng lưu trữ S3 đang được bật.

</details>

## Sao lưu / Xuất dữ liệu

Poznote hỗ trợ sao lưu tài khoản theo nhiều cách. Tất cả đều tạo ra cùng một tệp nén ZIP (gồm cơ sở dữ liệu, ghi chú và tệp đính kèm, kèm tệp `index.html` ở thư mục gốc để duyệt ngoại tuyến), và trang [Khôi phục / Nhập dữ liệu](#khôi-phục--nhập-dữ-liệu) đều chấp nhận tất cả các bản đó:

- **Thủ công**, tải trực tiếp từ Settings > Backup / Export.
- **Định kỳ theo lịch**, lưu vào một thư mục trên server hoặc một bucket tương thích S3 do quản trị viên cấu hình.
- **Từ script**, qua REST API, ví dụ bằng bash script bên dưới.

Chi tiết từng phương thức được trình bày dưới đây, và từng ghi chú riêng lẻ cũng có thể xuất độc lập.

<a id="complete-backup"></a>
<details>
<summary><strong>Sao lưu thành tệp Poznote ZIP</strong></summary>
<br>

Một tệp ZIP duy nhất chứa cơ sở dữ liệu, toàn bộ ghi chú và tệp đính kèm của tất cả các workspace:

  - Bao gồm một tệp `index.html` ở gốc để duyệt ngoại tuyến
  - Ghi chú được sắp xếp theo workspace và thư mục
  - Tệp đính kèm mở được qua các liên kết nhấp trực tiếp

Tệp nén được tạo ngầm bởi một tiến trình worker chứ không chạy trong chính HTTP request khởi tạo, nên các tài khoản dung lượng lớn sẽ không bị hết thời gian chờ của trình duyệt hay reverse proxy. Trang web theo dõi tiến độ tác vụ và tự động tải về ngay khi tệp sẵn sàng. Bạn có thể rời trang rồi quay lại, quá trình chuẩn bị vẫn chạy tiếp. Tệp nén đã tạo xong được giữ sẵn trong 24 giờ, và có nút cho phép xóa ngay lập tức.

#### Sao lưu từng người dùng vs Sao lưu toàn hệ thống

Tất cả các cách trên tạo ra **bản sao lưu theo từng người dùng**: mỗi tệp nén chỉ chứa dữ liệu thuộc về một tài khoản (cơ sở dữ liệu, ghi chú và tệp đính kèm của tài khoản đó). Mọi người dùng đều có thể tự sao lưu và khôi phục tài khoản của mình, còn quản trị viên có thể chọn bất kỳ tài khoản nào. Bản sao lưu của quản trị viên cũng mang theo logo của instance nếu có tải lên, và khi khôi phục vào tài khoản quản trị viên sẽ phục hồi lại logo đó.

Để **sao lưu toàn bộ hệ thống**, bao gồm cấu hình chủ (tài khoản, cài đặt toàn cục, liên kết chia sẻ) và toàn bộ người dùng cùng lúc, hãy sao chép toàn bộ thư mục `/data`:

```bash
# Complete system backup via CLI
tar -czvf poznote-full-backup.tar.gz data/
```

</details>

<a id="local-backups"></a>
<details>
<summary><strong>Sao lưu định kỳ vào một thư mục trên server</strong></summary>
<br>

Quản trị viên có thể thiết lập để các tệp nén sao lưu hoàn chỉnh (mỗi người dùng một tệp ZIP, giống hệt tệp tải từ "Backup to a Poznote ZIP file") được lưu vào một thư mục trên server, thực hiện thủ công hoặc tự động theo lịch, đồng thời chỉ giữ lại một số lượng bản mới nhất. Cách này không cần thành phần nào bên ngoài Poznote: không cần bucket, không cần cron job, không cần script.

Cấu hình tại **Settings > Server Backups** (chỉ dành cho quản trị viên).

- **Cấu hình:** Thư mục lưu sao lưu và thời hạn lưu giữ, dùng chung cho cả sao lưu tự động và thủ công.
  - **Backup folder:** Đường dẫn tuyệt đối trên server (tức bên trong container nếu dùng Docker). Nếu để trống, tệp nén sẽ được lưu vào `data/backups`, vốn đã nằm trong volume dữ liệu. Thư mục sẽ được tự tạo nếu cần và phải có quyền ghi cho user chạy web server.
  - **Retention:** Chỉ giữ lại N bản nén gần nhất cho mỗi người dùng, các bản cũ hơn sẽ bị xóa khỏi thư mục sau mỗi lượt sao lưu (nhập 0 để giữ tất cả).
- **Sao lưu tự động:** Khi bật, một worker chạy nền sẽ sao lưu các người dùng được đánh dấu trong ô này theo chu kỳ đã chọn (hằng ngày, hằng tuần hoặc hằng tháng). Mặc định tất cả đều được đánh dấu, và khi toàn bộ đang được đánh dấu thì các tài khoản mới tạo về sau cũng tự động được đưa vào. Lượt chạy đầu tiên diễn ra trong vài phút sau khi bật, các lượt tiếp theo chạy đúng theo chu kỳ đã chọn. Khung hiển thị kết quả lượt chạy tự động gần nhất và thời điểm lượt kế tiếp.
- **Sao lưu thủ công:** Khung sao lưu thủ công có bộ hộp kiểm người dùng riêng (mặc định không chọn ai) và nút "Back up now" để lưu ngay một bản nén mới cho từng người dùng đã chọn, lần lượt từng người kèm thanh tiến độ riêng. Lựa chọn này không được lưu lại và không làm thay đổi cấu hình sao lưu tự động (kể cả khi sao lưu tự động đang tắt).
- **Duyệt danh sách:** Trang liệt kê các bản nén hiện có trong thư mục. Menu thao tác trên từng bản nén cho phép tải về, khôi phục vào đúng tài khoản sở hữu nó, hoặc xóa bỏ.
- **Quyền truy cập cho người dùng:** Các bản nén nằm trong thư mục con `{user id}/` bên trong thư mục sao lưu. Ba công tắc (mặc định đều tắt) giúp mở tính năng này cho người dùng:
  - **Allow users to back up their account** thêm mục "Backup to a folder on the server" vào trang Backup / Export của mọi người dùng, đặt trước mục S3. Mỗi người dùng có thể tự lưu bản sao lưu tài khoản của mình vào thư mục đó, rồi tải các bản nén từ menu thao tác của từng bản. Các bản này cũng tính vào giới hạn lưu giữ như các bản khác.
  - **Allow users to delete their archives**: khi tắt tùy chọn này, nút Delete trong menu đó bị làm mờ, nên người dùng không thể xóa các bản nén của tài khoản mình, kể cả các bản do sao lưu tự động tạo ra. Giới hạn lưu giữ vẫn sẽ tự dọn các bản cũ nhất.
  - **Allow users to restore their account** thêm mục "Restore from a folder on the server" vào trang [Khôi phục / Nhập dữ liệu](#khôi-phục--nhập-dữ-liệu) của mọi người dùng có bản nén trong thư mục. Khi tắt, những người dùng đó sẽ thấy thông báo đề nghị liên hệ quản trị viên khôi phục hộ hoặc bật quyền khôi phục.
  - Quản trị viên luôn thực hiện được cả hai thao tác và có thể khôi phục bất kỳ bản nén nào trong danh sách. Một bản nén đã tải về máy vẫn có thể khôi phục qua mục "Restore from a Poznote ZIP backup".
- **Xóa tài khoản:** Xóa một tài khoản cũng sẽ xóa toàn bộ các bản nén của tài khoản đó khỏi thư mục sao lưu.

Để lưu bản sao lưu trên ổ đĩa khác hoặc thư mục chia sẻ mạng, hãy mount nó vào container và nhập đường dẫn bên trong container (`/backups` trong ví dụ dưới) vào ô thư mục sao lưu:

```yaml
services:
  webserver:
    volumes:
      - "./data:/var/www/html/data"
      - "/mnt/nas/poznote-backups:/backups"
```

Thư mục nằm bên trong chính mã nguồn ứng dụng sẽ bị từ chối, ngoại trừ `data/backups`. Khi tệp đính kèm được lưu trên S3 (Lưu trữ tệp đính kèm S3), chúng vẫn được gộp vào bản sao lưu bằng cách tải trực tiếp từ bucket lúc đóng gói.

</details>

<a id="s3-backups"></a>
<details>
<summary><strong>Sao lưu định kỳ lên S3 bucket</strong></summary>
<br>

Quản trị viên có thể đẩy các tệp nén sao lưu hoàn chỉnh (mỗi người dùng một tệp ZIP, giống hệt tệp tải từ "Backup to a Poznote ZIP file") lên một bucket tương thích S3, thực hiện thủ công hoặc tự động theo lịch. Cấu hình này độc lập hoàn toàn với cấu hình Lưu trữ tệp đính kèm S3, nên bản sao lưu có thể nhắm tới một bucket hoặc nhà cung cấp khác.

Cấu hình tại **Settings > S3 Backups** (chỉ dành cho quản trị viên).

- **Công tắc chính:** Nút bật/tắt ở đầu trang kích hoạt hoặc vô hiệu hóa toàn bộ tính năng. Khi tắt, sao lưu tự động dừng lại và các mục sao lưu/khôi phục S3 biến mất khỏi giao diện của mọi người dùng (các thao tác tự phục vụ cũng bị từ chối ở phía server).
- **Cấu hình:** Endpoint URL, region, bucket, access key, secret key và kiểu địa chỉ path-style, kèm nút kiểm tra kết nối tích hợp sẵn.
- **Chọn người dùng:** Các hộp kiểm quyết định những người dùng nào được đưa vào danh sách sao lưu. Mặc định tất cả đều được chọn, và khi toàn bộ đang được chọn thì các tài khoản mới tạo sau này cũng tự động được bao gồm.
- **Sao lưu thủ công:** Nút "Back up now" tải lên ngay một bản nén mới cho từng người dùng đã chọn, lần lượt từng người kèm tiến độ riêng. Tính năng này chạy được ngay khi kết nối đã cấu hình xong, kể cả khi sao lưu tự động đang tắt.
- **Sao lưu tự động:** Khi bật, worker chạy nền sẽ sao lưu các người dùng đã chọn theo chu kỳ thiết lập (hằng ngày, hằng tuần hoặc hằng tháng). Lượt chạy đầu tiên diễn ra trong vài phút sau khi bật, các lượt tiếp theo theo đúng chu kỳ đã chọn.
- **Lưu giữ (Retention):** Chỉ giữ lại N bản nén gần nhất cho mỗi người dùng, các bản cũ hơn bị xóa khỏi bucket sau mỗi lượt sao lưu (nhập 0 để giữ tất cả).
- **Duyệt danh sách:** Trang hiển thị các bản nén đang nằm trên bucket kèm thao tác tải về và xóa.
- **Khôi phục:** Các bản nén nằm tại `backups/{user id}/` trong bucket và có thể khôi phục trực tiếp qua trang [Khôi phục / Nhập dữ liệu](#khôi-phục--nhập-dữ-liệu) thông thường.
- **Tự phục vụ:** Khi bucket đã được cấu hình, mỗi người dùng đều có mục "Backup to S3" trên trang Backup / Export để tải lên bản nén mới của tài khoản mình, cũng như tải về hoặc xóa các bản sẵn có. Mục "Restore from S3" trên trang Restore / Import cho phép họ tự khôi phục tài khoản từ một trong các bản đó.
- **Cô lập người thuê:** Hai tùy chọn ("S3 backups on the Backup page" và "S3 restore on the Restore page") dùng để tắt các mục tự phục vụ này đối với người dùng không phải quản trị viên. Quy định này được kiểm soát ở phía server nên các thao tác bị chặn vẫn bị từ chối dù gọi API trực tiếp.

Khi tệp đính kèm được lưu trên S3 (Lưu trữ tệp đính kèm S3), chúng mặc định được gộp vào bản sao lưu bằng cách tải trực tiếp từ bucket lúc chạy. Có một tùy chọn cho phép bỏ qua chúng để tệp sao lưu nhẹ hơn và chạy nhanh hơn.

</details>

<a id="automated-backups-with-bash-script"></a>
<details>
<summary><strong>Sao lưu tự động bằng Bash Script</strong></summary>
<br>

Để tự động lên lịch sao lưu qua API, bạn có thể dùng script `backup-poznote.sh` đi kèm sẵn.

**QUAN TRỌNG:** Chỉ quản trị viên mới có thể tạo bản sao lưu qua API.
Hãy dùng mật khẩu hiện tại của hồ sơ quản trị mà bạn dùng để xác thực. Trên bản cài mới, đó là mật khẩu quản trị mặc định (`admin`) cho đến khi được đổi trong Poznote. Một khi đã đặt mật khẩu tùy chỉnh, bạn bắt buộc phải dùng mật khẩu đó cho các lệnh gọi API.

**Vị trí script:** `backup-poznote.sh` nằm trong thư mục `tools` của kho mã nguồn Poznote.

**Cách dùng dành cho quản trị viên:**

Quản trị viên có thể sao lưu bất kỳ hồ sơ người dùng nào mà **không cần biết user ID**, chỉ cần tên đăng nhập:

```bash
# Backup your own profile
bash backup-poznote.sh 'https://poznote.example.com' 'admin' 'admin_password' 'admin' '/backups' '30'

# Backup another user's profile (Nina)
bash backup-poznote.sh 'https://poznote.example.com' 'admin' 'admin_password' 'Nina' '/backups' '30'
```

**Cú pháp sử dụng:**
```bash
bash backup-poznote.sh '<poznote_url>' '<admin_username>' '<admin_password>' '<target_username>' '<backup_directory>' '<retention_count>'
```

**Ví dụ với crontab (quản trị viên sao lưu cho Nina):**

```bash
# Add to crontab for automated backups twice daily
0 0,12 * * * bash /root/backup-poznote.sh 'https://poznote.example.com' 'admin' 'admin_password' 'Nina' '/root/backups' '30'
```

**Giải thích tham số:**
- `'https://poznote.example.com'` - URL instance Poznote của bạn
- `'admin'` - Tên đăng nhập quản trị để xác thực (bắt buộc phải là quản trị viên)
- `'admin_password'` - Mật khẩu quản trị hiện tại của hồ sơ API (mặc định là `admin` cho đến khi đổi, sau đó dùng mật khẩu mới)
- `'Nina'` - Tên đăng nhập mục tiêu cần sao lưu
- `'/root/backups'` - Thư mục gốc nơi lưu các bản sao lưu (sẽ tạo thư mục con `backups-poznote-<username>`)
- `'30'` - Số lượng bản sao lưu cần giữ lại (các bản cũ hơn tự động bị xóa)

**Quy trình sao lưu hoạt động ra sao:**

1. Script xác thực bằng thông tin quản trị
2. Tự động tra cứu user ID từ tên đăng nhập
3. Tạo một bản sao lưu thông qua API
4. Gọi Poznote REST API v1 (`POST /api/v1/backups` kèm header `X-User-ID`)
5. Tải tệp ZIP sao lưu về máy cục bộ vào `backups-poznote-<username>/`
6. Tự động quản lý thời hạn lưu giữ (chỉ giữ lại đúng số lượng bản mới nhất đã chỉ định)

**Lưu ý:** Bản sao lưu của mỗi người dùng được lưu trong các thư mục riêng biệt (`backups-poznote-Nina`, `backups-poznote-Tim`, v.v.)

</details>

<a id="export-individual-notes"></a>
<details>
<summary><strong>Xuất từng ghi chú riêng lẻ</strong></summary>
<br>

Xuất từng ghi chú bằng nút **Export** trên thanh công cụ ghi chú:

  - **Ghi chú Rich text:** Xuất ra HTML, hoặc thành một tệp HTML duy nhất có nhúng sẵn toàn bộ hình ảnh
  - **Ghi chú Markdown:** Xuất ra Markdown, ra HTML, hoặc thành một tệp HTML duy nhất có nhúng sẵn hình ảnh
  - **Danh sách công việc:** Các tùy chọn tương tự, cộng thêm xuất JSON thô của danh sách

</details>

## Khôi phục / Nhập dữ liệu

Poznote cung cấp các tùy chọn khôi phục linh hoạt qua giao diện web (**Settings > Restore/Import**) hoặc qua REST API dành cho quản trị viên. Người dùng có thể tự khôi phục dữ liệu hồ sơ từ bản sao lưu ZIP đầy đủ hoặc nhập từng tệp lẻ, còn quản trị viên có thể quản lý khôi phục trên toàn hệ thống.

<a id="complete-restore"></a>
<details>
<summary><strong>Khôi phục từ bản sao lưu Poznote ZIP</strong></summary>
<br>

Tải lên tệp ZIP sao lưu đầy đủ để khôi phục toàn bộ:

  - Thay thế cơ sở dữ liệu, khôi phục toàn bộ ghi chú và tệp đính kèm
  - Áp dụng cùng lúc cho mọi workspace

Không có giới hạn dung lượng thực tế nào. Tệp nén được tải lên theo từng lát nhỏ (một lát lỗi sẽ tự thử lại thay vì hỏng cả quá trình tải), ghép lại trên server, rồi được giải nén và khôi phục bởi một worker chạy nền, nên cả trình duyệt lẫn reverse proxy đứng trước instance đều không bị quá giờ (timeout). Thanh tiến trình theo sát toàn bộ quy trình: tải lên, giải nén, cơ sở dữ liệu, ghi chú, rồi tệp đính kèm. Khi khôi phục hoàn tất, Poznote hỏi bạn muốn mở workspace nào.

Việc khôi phục từ S3 bucket (xem [Sao lưu S3](#s3-backups)) cũng chạy trên cùng cơ chế tác vụ nền đó, nên việc kéo một tệp nén lớn từ bucket về khôi phục cũng không phụ thuộc vào thời gian sống của HTTP request.

Nếu hoàn toàn không thể tải lên qua trình duyệt, trang Restore / Import còn có phương án dự phòng "Restore by direct copy": chép tệp nén vào đúng đường dẫn `/tmp/backup_restore.zip` bên trong container Poznote qua SSH, tải lại trang và khôi phục từ đó.

</details>

<a id="import-individual-notes"></a>
<details>
<summary><strong>Nhập từng tệp riêng lẻ</strong></summary>
<br>

Nhập trực tiếp một hoặc nhiều ghi chú HTML, Markdown hoặc văn bản thuần:

  - Hỗ trợ các định dạng `.html`, `.md`, `.markdown`, `.txt` và `.json`
  - Chọn được tối đa 50 tệp cùng lúc, có thể chỉnh lại trong Settings > Admin Tools > Import Limits

</details>

<a id="import-zip-notes"></a>
<details>
<summary><strong>Nhập tệp ZIP</strong></summary>
<br>

Nhập một tệp nén ZIP chứa nhiều ghi chú:

  - Hỗ trợ các định dạng `.html`, `.md`, `.markdown` hoặc `.txt`
  - Tệp ZIP có thể chứa tối đa 300 tệp, có thể chỉnh lại trong Settings > Admin Tools > Import Limits
  - Khi nhập tệp ZIP, Poznote tự động nhận diện và tái tạo lại cấu trúc thư mục

Không có giới hạn dung lượng thực tế cho tệp nén. Giống như khôi phục toàn phần, tệp được tải lên theo từng lát nhỏ (lỗi lát nào thử lại lát đó thay vì mất công tải lại từ đầu), ghép lại trên server, rồi được xử lý bởi worker chạy nền để không bao giờ bị timeout ở trình duyệt hay reverse proxy. Thanh tiến trình theo dõi toàn bộ quy trình: tải lên, hình ảnh và tệp đính kèm, rồi đến ghi chú.

</details>

<a id="import-obsidian-notes"></a>
<details>
<summary><strong>Chuyển dữ liệu từ kho Obsidian (Obsidian vault)</strong></summary>
<br>

Một Obsidian vault thực chất là một thư mục chứa các tệp Markdown, nên có thể nhập nguyên vẹn chỉ trong một tệp nén ZIP.

**Các bước thực hiện**

1. Nén thư mục vault của bạn thành một tệp ZIP. Không cần dọn dẹp gì trước: các thư mục ẩn như `.obsidian` hay `.trash` tự động bị bỏ qua.
2. Trong Poznote, mở **Settings > Restore/Import** và đi tới mục nhập tệp và tệp ZIP. Chọn workspace đích (một workspace mới tinh sẽ giúp dễ kiểm tra kết quả hơn), chọn tệp ZIP rồi bắt đầu nhập. Thả tệp ZIP trực tiếp vào danh sách ghi chú ở trang chính cũng cho kết quả tương tự.
3. Đọc bản tóm tắt hiển thị khi hoàn tất: nó báo rõ số lượng ghi chú, thư mục, hình ảnh và tệp PDF đã nhập, đồng thời nêu tên những tệp không nhập được.

Một tệp ZIP chứa được tối đa 300 ghi chú (không tính hình ảnh và PDF), giới hạn này quản trị viên có thể tăng trong Settings > Admin Tools > Import Limits. Dung lượng tệp nén không bị giới hạn, xem [Nhập tệp ZIP](#import-zip-notes).

**Những gì được giữ nguyên**

  - Ghi chú: mọi tệp `.md` trở thành một ghi chú Markdown mang tên của tệp, hoặc theo khóa `title` trong phần front matter của nó.
  - Thư mục: cây thư mục của vault được tái tạo đầy đủ kể cả thư mục con. Nếu toàn bộ vault nằm gọn trong một thư mục cấp cao nhất duy nhất của tệp ZIP, thư mục bọc ngoài đó sẽ được bỏ qua.
  - Tag: khóa `tags` trong front matter, và dòng `#tags` ở ngay đầu ghi chú. Khoảng trắng trong tag chuyển thành dấu gạch dưới.
  - Front matter: các khóa `title`, `folder`, `tags`, `favorite`, `created` và `updated` đều được đọc, xem [Hỗ trợ Markdown Front Matter](#markdown-front-matter).
  - Liên kết giữa các ghi chú: `[[Note title]]` hoạt động ngay lập tức. Poznote phân giải theo tiêu đề, hiển thị thành liên kết nội bộ và thống kê trong phần backlink cũng như biểu đồ graph.
  - Hình ảnh: `![[image.png]]`, `![[image.png|caption]]` và `![caption](image.png)` trở thành tệp đính kèm của ghi chú và hiển thị ngay đúng vị trí, bất kể ảnh nằm ở đâu trong vault (cạnh ghi chú, trong thư mục con hay trong thư mục `attachments`).
  - Tệp PDF: một tệp PDF được liên kết từ ghi chú (`![[file.pdf]]`, `[[file.pdf]]` hoặc liên kết Markdown) sẽ được đính kèm vào ghi chú đó và liên kết trỏ tới tệp đính kèm. Mọi tệp PDF khác nằm cạnh ghi chú hoặc trong thư mục `attachments` trở thành một ghi chú đặt tên theo tệp, có chính tệp PDF đó làm tệp đính kèm, nằm đúng vị trí thư mục tương ứng trong vault.

**Những gì không được chuyển đổi**

  - Liên kết có tên thay thế hoặc trỏ tới tiêu đề con (`[[Note|alias]]`, `[[Note#Heading]]`) được giữ nguyên dạng văn bản nhưng không trỏ thành liên kết sang ghi chú.
  - Nhúng ghi chú (`![[Other note]]`) và nội dung của plugin: truy vấn Dataview, tệp `.canvas`, hình vẽ tạo bằng plugin Obsidian Excalidraw.
  - Tag viết ở giữa thân ghi chú vẫn giữ nguyên dạng văn bản thuần.
  - Các loại tệp khác nằm cạnh ghi chú (âm thanh, video, tài liệu Office) sẽ bị bỏ qua. Bạn có thể đính kèm thủ công vào ghi chú tương ứng sau đó.

Hình ảnh và tệp PDF được khớp theo tên tệp chứ không theo đường dẫn. Nếu hai tệp trong vault trùng tên nhau, hãy đổi tên một tệp trước khi nhập.

</details>

<a id="markdown-front-matter"></a>
<details>
<summary><strong>Hỗ trợ Markdown Front Matter</strong></summary>
<br>

Tệp Markdown có thể chứa YAML front matter để khai báo siêu dữ liệu cho ghi chú. Các khóa sau được hỗ trợ:

  - `title`: Ghi đè tiêu đề ghi chú (mặc định: tên tệp bỏ phần mở rộng)
  - `folder`: Ghi đè thư mục đích. Tên đơn phải khớp với một thư mục đã tồn tại trong workspace; đường dẫn dạng `Projects/2026` sẽ tự tạo các thư mục còn thiếu.
  - `tags`: Mảng các tag gắn vào ghi chú. Hỗ trợ cả cú pháp trên một dòng `[tag1, tag2]` lẫn nhiều dòng
  - `favorite`: Đánh dấu ghi chú yêu thích (`true` hoặc `false`)
  - `created`: Đặt ngày tạo tùy chỉnh (định dạng: `YYYY-MM-DD HH:MM:SS`)
  - `updated`: Đặt ngày cập nhật tùy chỉnh (định dạng: `YYYY-MM-DD HH:MM:SS`)

Ví dụ với cú pháp mảng một dòng:
```yaml
---
title: My Important Note
folder: Projects
tags: [important, work]
favorite: true
created: 2024-01-15 10:30:00
updated: 2024-01-20 15:45:00
---
```

Ví dụ với cú pháp nhiều dòng:
```yaml
---
title: My Important Note
folder: Projects
tags:
  - important
  - work
favorite: true
created: 2024-01-15 10:30:00
updated: 2024-01-20 15:45:00
---
```

</details>


## Chế độ ngoại tuyến (Offline)

Poznote vẫn tiếp tục làm việc khi không có mạng theo hai cách: các ghi chú bạn mới sửa gần đây, mục yêu thích và những ghi chú hay thư mục bạn chủ động chọn giữ lại vẫn có sẵn ngay trong trình duyệt để đọc và chỉnh sửa, đồng thời một bản sao lưu hoàn chỉnh có thể mở duyệt ở bất cứ đâu dưới dạng xuất chỉ-đọc.

<details>
<summary><strong>Ghi chú ngoại tuyến</strong></summary>
<br>

Các ghi chú bạn chỉnh sửa trong 5 ngày gần nhất được tự động lưu giữ trên từng trình duyệt bạn dùng Poznote, và bản sao này được làm mới sau mỗi lần lưu. Khi ở giảng đường, trên tàu hay bất cứ nơi nào mất Wi-Fi, cứ mở đúng địa chỉ Poznote thường dùng: trình duyệt sẽ hiển thị phiên bản ngoại tuyến của Poznote với đầy đủ thanh bên, trình soạn thảo, thanh công cụ, tìm kiếm và các tab (nhấp đúp hoặc nhấp chuột giữa mở ghi chú trong tab mới, và các tab đang mở khi có mạng cũng được giữ lại), chỉ liệt kê những ghi chú được lưu ngoại tuyến.

*   **Đăng nhập:** nhập mật khẩu lần cuối bạn dùng để đăng nhập trên trình duyệt này, hệ thống kiểm tra cục bộ không cần server. Nếu trước đó bạn chưa từng gõ mật khẩu trên trình duyệt này (do dùng SSO hoặc tự động đăng nhập), tài khoản dùng gần nhất ở đó sẽ mở ra qua nút **Continue as**.
*   **Đọc và chỉnh sửa:** Ghi chú Rich text, ghi chú Markdown và danh sách công việc đều mở bằng trình soạn thảo quen thuộc, và bạn vẫn tạo được ghi chú mới. Menu `/` và menu chuột phải vẫn hoạt động, ngoại trừ các lệnh đòi hỏi có server (tải ảnh và tệp lên, mẫu ghi chú, bảng vẽ, liên kết sang ghi chú khác). Các loại ghi chú khác như bảng vẽ chỉ dùng được khi có mạng. Thay đổi được giữ tạm trong trình duyệt cho tới khi gửi lên được.
*   **Giữ ngoại tuyến:** mục yêu thích luôn được giữ sẵn, và nút **Keep offline** trong menu của ghi chú hoặc thư mục (gồm cả thư mục con) giữ lại ghi chú bất kể ngày tạo/sửa, kèm mọi tệp đính kèm (PDF, âm thanh, tài liệu) tới 25 MB mỗi tệp. Chính menu của ghi chú cũng báo cho bạn biết nó đã sẵn sàng ngoại tuyến trên trình duyệt này chưa, và trang Notes cùng Folders cũng đánh dấu các ghi chú và thư mục đang có sẵn ngoại tuyến. Trang Notes còn cho phép chọn giữ ngoại tuyến hàng loạt (hoặc bỏ giữ) qua menu thao tác hàng loạt, còn trang Folders có mục **Keep offline** trong menu của từng thư mục.
*   **Trang Offline:** nút **Offline** trên thanh biểu tượng liệt kê các ghi chú và thư mục đang giữ ngoại tuyến giống như trang Shares: thư mục dạng cây kèm ghi chú, lý do từng ghi chú được giữ (đã chọn giữ ngoại tuyến, nằm trong thư mục giữ ngoại tuyến, yêu thích, mới sửa gần đây), bộ lọc và nút bật/tắt giữ ngoại tuyến. Biểu tượng cảnh báo đánh dấu những ghi chú trình duyệt hiện tại chưa kịp tải về.
*   **Khi có mạng trở lại:** các thay đổi được tự động gửi lên server. Nếu trong thời gian đó ghi chú cũng bị sửa trên server, hai phiên bản sẽ tự động gộp lại khi có thể; nếu không, phiên bản ngoại tuyến của bạn được lưu thành một ghi chú riêng tên "... (offline copy)". Ghi chú đã bị xóa trên server trong lúc bạn mất mạng sẽ được tạo lại.
*   **Cài đặt:** **Settings > Sync & history > Offline notes** thiết lập số ngày giữ ghi chú (mặc định 5 ngày, tối đa 30, đặt 0 để tắt ghi chú ngoại tuyến) và hiển thị những gì trình duyệt hiện tại đang lưu.
*   **Giới hạn:** tối đa 300 ghi chú và 50 MB văn bản, ưu tiên các ghi chú sửa gần đây nhất. Tệp cũng được giữ kèm: các hình ảnh hiển thị trong những ghi chú đó, cùng mọi tệp đính kèm (PDF, âm thanh, tệp khác) của mục yêu thích và ghi chú đánh dấu **Keep offline**, tối đa 25 MB mỗi tệp, tổng cộng 400 tệp và 200 MB, và không bao giờ vượt quá một nửa dung lượng trống còn lại của trình duyệt. Tệp lớn hơn chỉ dùng trực tuyến, và ghi chú sẽ báo rõ khi mở ngoại tuyến.
*   **Yêu cầu:** Poznote phải chạy qua HTTPS (trình duyệt chỉ cho lưu trang ngoại tuyến trên kết nối bảo mật; `http://localhost` cũng được chấp nhận) và phải được mở ít nhất một lần khi có mạng trong trình duyệt sau khi đăng nhập để tạo bản sao.
*   **Quyền riêng tư:** chỉ các ghi chú của chính tài khoản bạn mới được giữ lại, không lưu ghi chú của tài khoản khác hay workspace được chia sẻ với bạn. Dữ liệu nằm trong trình duyệt ở dạng không mã hóa. Đăng xuất sẽ xóa toàn bộ bản sao khỏi trình duyệt (bao gồm cả các thay đổi chưa kịp gửi lên, sau một cảnh báo liệt kê rõ chúng): trên máy tính dùng chung, hãy đăng xuất khi rời đi. Đăng xuất cũng hoạt động ngay cả khi mất mạng từ trang Offline: các ghi chú bị xóa khỏi trình duyệt ngay lập tức, và phiên trên server sẽ kết thúc ở lần tiếp theo Poznote mở có mạng.

</details>

<details>
<summary><strong>Xuất dữ liệu ngoại tuyến</strong></summary>
<br>

Tính năng **📦 Backup to a Poznote ZIP file** tạo ra một bản sao lưu ngoại tuyến độc lập cho các ghi chú của bạn. Chỉ cần giải nén tệp ZIP và mở `index.html` trong bất kỳ trình duyệt nào. Cách này giúp bạn đọc lại ghi chú khi không có mạng, nhưng chỉ ở dạng xem chỉ-đọc chứ không có đầy đủ chức năng của Poznote.

</details>

## Chạy nhiều instance

> Đừng nhầm lẫn với tính năng [Đa người dùng](#đa-người-dùng).

Bạn có thể chạy nhiều instance Poznote cô lập hoàn toàn trên cùng một server. Mỗi instance có dữ liệu, cổng và thông tin đăng nhập riêng.

Rất phù hợp khi:
- Lưu trữ cho nhiều người dùng khác nhau trên cùng một server, mỗi người có một instance và tài khoản riêng biệt
- Thử nghiệm tính năng mới mà không làm ảnh hưởng tới instance chính đang chạy thực tế

Chỉ cần lặp lại các bước cài đặt trong các thư mục khác nhau với các cổng khác nhau.

### Ví dụ: Hai instance của Tom và Alice trên cùng một server

```
Server: my-server.com
├── Poznote-Tom
│   ├── Port: 8040
│   ├── URL: http://my-server.com:8040
│   ├── Container: poznote-tom-webserver-1
│   └── Data: ./poznote-tom/data/
│
└── Poznote-Alice
    ├── Port: 8041
    ├── URL: http://my-server.com:8041
    ├── Container: poznote-alice-webserver-1
    └── Data: ./poznote-alice/data/
```

## Trợ lý AI

Poznote tích hợp sẵn khung chat AI có thể kết nối tới instance [Ollama](https://ollama.com) hoặc [LM Studio](https://lmstudio.ai) cục bộ, nhà cung cấp đám mây như [Anthropic (Claude)](https://www.anthropic.com) hoặc OpenAI, hay bất kỳ server nào tương thích chuẩn OpenAI. Trợ lý tìm kiếm và đọc ghi chú để trả lời câu hỏi, xem được hình ảnh bên trong ghi chú, và khi bạn yêu cầu, tạo mới, viết lại và sắp xếp ghi chú trong đúng workspace nơi bạn mở khung chat.

Quản trị viên bật tính năng này tại **Settings → Admin Tools → AI Assistant** rồi đánh dấu các hồ sơ được phép dùng (quản trị viên luôn được phép); mỗi người được cấp quyền sẽ có nút **AI assistant** trên thanh biểu tượng bên trái. Server AI được gọi từ phía server Poznote chứ không bao giờ từ trình duyệt, nên khi dùng Ollama cục bộ, ghi chú của bạn không bao giờ rời khỏi máy.

Những việc trợ lý làm được, cách chọn nhà cung cấp và mô hình, API key cá nhân, các công cụ bên ngoài như tìm kiếm web (MCP server từ xa) và cách kết nối tới server cục bộ từ container Poznote đều được trình bày trong [tài liệu Trợ lý AI](AI-ASSISTANT.vi.md). Nếu bạn muốn một trợ lý AI bên ngoài (VS Code Copilot, Claude CLI...) quản lý ghi chú, xem mục [MCP Server](#mcp-server) bên dưới.

## Chuyển giọng nói thành văn bản (Transcription)

Chuyển giọng nói thành văn bản ghi chú bằng server speech-to-text do chính bạn vận hành. Poznote không nhúng sẵn mô hình giọng nói: nó gửi âm thanh tới bất kỳ server nào hỗ trợ OpenAI audio API (`POST /v1/audio/transcriptions`), chẳng hạn bản Whisper tự lưu trữ, nhờ đó dữ liệu âm thanh không bao giờ rời khỏi máy của bạn.

Sau khi quản trị viên bật tính năng trong **Settings → Admin Tools → Transcription** và chọn các hồ sơ được phép sử dụng (quản trị viên luôn được phép), mục **Record audio** dưới **Insert** trong menu `/` sẽ có thêm nút **Transcribe** bên cạnh **Insert the audio**, và các tệp âm thanh đính kèm cũng có nút **Transcribe**.

Cách dựng server, chọn mô hình và mọi chi tiết khác đều có trong [tài liệu Transcription](TRANSCRIPTION.vi.md).

## MCP Server

Poznote đi kèm một Model Context Protocol (MCP) server cho phép các trợ lý AI như GitHub Copilot hoặc Claude CLI tương tác với ghi chú của bạn bằng ngôn ngữ tự nhiên. Ví dụ:

- "Tạo ghi chú mới tiêu đề 'Ghi chú cuộc họp' với nội dung..."
- "Tìm các ghi chú nói về 'Docker'"
- "Liệt kê tất cả ghi chú trong workspace Poznote của tôi"
- "Cập nhật ghi chú 42 với thông tin mới"

MCP server được đóng gói sẵn trong tệp `docker-compose.yml` chính thức và mặc định chỉ mở trên `127.0.0.1`, nên không có gì bên ngoài máy của bạn truy cập được. Hướng dẫn cài đặt, cấu hình client, tùy chỉnh cổng và chế độ debug, cũng như cách bảo vệ bằng `POZNOTE_MCP_AUTH_TOKEN` khi bạn mở ra ngoài đều nằm trong [tài liệu MCP Server](MCP-SERVER.vi.md).

## Ứng dụng

Poznote chạy trên mọi trình duyệt, đồng thời có thể cài đặt trực tiếp từ trình duyệt dưới dạng ứng dụng web (PWA): khi đó ứng dụng có biểu tượng và cửa sổ riêng giống như ứng dụng gốc.

*   **Android và máy tính:** mở instance Poznote của bạn trong Chrome hoặc Edge rồi chọn **Install** trong menu trình duyệt.
*   **Firefox trên Android:** mở instance Poznote trong Firefox rồi chọn **Add to Home screen** trong menu trình duyệt.
*   **iPhone và iPad:** mở instance Poznote trong Safari, chạm **Share**, rồi chọn **Add to Home Screen**.

> Việc cài đặt ứng dụng web yêu cầu Poznote phải chạy qua HTTPS (`http://localhost` cũng hoạt động).

Trang [Apps](https://poznote.com/apps.html) trên website liệt kê đầy đủ mọi thứ hiện có: ứng dụng web, tiện ích mở rộng Chrome và các ứng dụng di động do cộng đồng phát triển.

## Tiện ích mở rộng Chrome

**Poznote URL Saver** là tiện ích mở rộng trình duyệt giúp lưu URL, hoặc thậm chí ảnh chụp toàn trang, của trang hiện tại vào instance Poznote chỉ với một cú nhấp chuột. Cài đặt từ Chrome Web Store: [Cài đặt tiện ích](https://chromewebstore.google.com/detail/bmjclfamahegmgillaghhmnbkjebipbh?utm_source=item-share-cb)

Tiện ích kết nối vào instance bằng tên đăng nhập và một [mật khẩu ứng dụng](#mật-khẩu-ứng-dụng). Các bước thiết lập nằm trong [tài liệu Tiện ích mở rộng Chrome](CHROME-EXTENSION.vi.md).

## Chia sẻ tới Poznote trên Android

Trên Android, Poznote xuất hiện trong menu **Share** của hệ thống ngay sau khi PWA được cài đặt. Chỉ cần chia sẻ một trang từ Chrome (hoặc liên kết/văn bản từ bất kỳ ứng dụng nào) rồi chọn Poznote, một ghi chú mới sẽ được tạo kèm tiêu đề trang và liên kết nhấp được mà không cần tiện ích mở rộng nào.

Cách sử dụng:

1. Mở instance Poznote của bạn trong Chrome trên Android và cài đặt nó thành ứng dụng (menu → **Add to Home screen** → **Install**).
2. Trong bất kỳ ứng dụng nào, chạm **Share**, rồi chọn **Poznote**.

> Nếu Poznote chưa hiện ngay trong menu chia sẻ, hãy kiểm tra xem bạn đã cài nó thành ứng dụng chưa (chứ không phải chỉ là lối tắt bookmark). Nếu bạn đã cài PWA từ trước khi tính năng này ra mắt, Chrome sẽ tự nhận diện năng lực mới sau vài ngày, hoặc có hiệu lực ngay nếu bạn cài đặt lại ứng dụng.

## Tài liệu API

Poznote cung cấp RESTful API v1 toàn diện cho phép truy cập lập trình tới ghi chú, thư mục, workspace, tag, tệp đính kèm, sao lưu, cài đặt và nhiều thành phần khác.

Để xem tài liệu tham chiếu API đầy đủ với toàn bộ endpoint, tham số và ví dụ curl, hãy xem **[Tài liệu REST API](API-REST.md)**.

### Bắt đầu nhanh

```bash
# List all notes for user ID 1
curl -u 'username:password' -H "X-User-ID: 1" \
  http://YOUR_SERVER/api/v1/notes

# Same, with an app password created in Settings > App passwords
# (works on SSO-only instances; X-User-ID is implied)
curl -u 'username:pzn_2f7c…' http://YOUR_SERVER/api/v1/notes

# Create a note
curl -X POST -u 'username:password' -H "X-User-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"heading": "My Note", "content": "Hello!", "type": "markdown"}' \
  http://YOUR_SERVER/api/v1/notes
```

### Tài liệu tương tác (Swagger)

Truy cập **Swagger UI** trực tiếp từ Poznote tại `Settings > About > API REST` để duyệt toàn bộ endpoint, xem cấu trúc request/response và thử nghiệm gọi API trực tiếp.

## Công nghệ sử dụng

Poznote ưu tiên sự đơn giản và tính di động: không framework phức tạp, không phụ thuộc cồng kềnh. Chỉ sử dụng các công nghệ web trực diện, đáng tin cậy để đảm bảo ghi chú của bạn luôn dễ tiếp cận và nằm trọn dưới quyền kiểm soát của bạn.

**Kiến trúc ưu tiên quyền riêng tư:** Poznote vận hành hoàn toàn cục bộ, không đòi hỏi kết nối ra ngoài để hoạt động. Mọi thư viện (Excalidraw, Mermaid, KaTeX) đều được đóng gói sẵn và phục vụ từ chính instance của bạn. Mặc định kết nối đi ra duy nhất là lượt kiểm tra cập nhật hằng ngày; các tính năng tùy chọn do chính bạn bật lên (Git Sync, S3, nhà cung cấp AI và công cụ bên ngoài bạn nối vào, webhook, SMTP, OIDC) là những kết nối ra ngoài duy nhất khác.

<details>
<summary>Nếu bạn quan tâm đến nền tảng công nghệ tạo nên Poznote, <strong>hãy xem tại đây.</strong></summary>

### Backend
- **PHP 8.5** - Ngôn ngữ lập trình phía server
- **SQLite 3** - Cơ sở dữ liệu quan hệ gọn nhẹ lưu trên tệp

### Frontend
- **HTML5** - Đánh dấu và cấu trúc trang
- **CSS3** - Định kiểu và thiết kế đáp ứng (responsive)
- **JavaScript (Vanilla)** - Tính năng tương tác và nội dung động
- **Vite** - Công cụ build cho thành phần Excalidraw (React) và CodeMirror (đóng gói dạng IIFE)
- **AJAX** - Tải dữ liệu bất đồng bộ

### Thư viện
- **CodeMirror 6** - Trình soạn thảo mã và văn bản mở rộng cho trải nghiệm viết Markdown
- **Excalidraw** - Bảng trắng ảo để phác thảo sơ đồ và hình vẽ
- **Mermaid** - Thư viện JavaScript phía client để sinh sơ đồ và lưu đồ từ văn bản
- **KaTeX** - Thư viện JavaScript phía client để dàn trang và kết xuất công thức toán học tốc độ cao
- **Sortable.js** - Thư viện JavaScript hỗ trợ kéo thả sắp xếp
- **Lucide** - Bộ biểu tượng sử dụng xuyên suốt giao diện
- **Devicon** - Biểu tượng ngôn ngữ lập trình cho các khối code
- **highlight.js** - Tô sáng cú pháp cho các khối code
- **Swagger UI** - Tài liệu API tương tác và giao diện thử nghiệm

### Lưu trữ
- **Tệp HTML/Markdown** - Ghi chú được lưu dưới dạng tệp HTML hoặc Markdown thuần trên hệ thống tệp
- **Cơ sở dữ liệu SQLite** - Siêu dữ liệu, tag, liên kết quan hệ và dữ liệu người dùng
- **Tệp đính kèm** - Lưu trên hệ thống tệp cục bộ, hoặc tùy chọn trên kho đối tượng tương thích S3

### Hạ tầng
- **Nginx + PHP-FPM** - Web server hiệu năng cao đi kèm FastCGI Process Manager
- **Alpine Linux** - Image nền nhẹ và bảo mật
- **Docker** - Đóng gói container giúp triển khai và di chuyển dễ dàng
- **Supervisor** - Vận hành Nginx, PHP-FPM và các worker nền (nhắc việc, sao lưu định kỳ)
- **Python 3.12 (Alpine)** - Môi trường chạy MCP server với các thư viện httpx, uvicorn và fastmcp phục vụ tích hợp trợ lý AI
</details>
