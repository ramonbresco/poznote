<!-- lang-selector -->
<p align="center">
  <a href="TRANSCRIPTION.md">English</a> ·
  <a href="TRANSCRIPTION.fr.md">Français</a> ·
  <a href="TRANSCRIPTION.de.md">Deutsch</a> ·
  <a href="TRANSCRIPTION.es.md">Español</a> ·
  <a href="TRANSCRIPTION.pt.md">Português</a> ·
  <a href="TRANSCRIPTION.ru.md">Русский</a> ·
  <a href="TRANSCRIPTION.zh-cn.md">简体中文</a> ·
  <a href="TRANSCRIPTION.ko.md">한국어</a> ·
  <a href="TRANSCRIPTION.ja.md">日本語</a> ·
  <a href="TRANSCRIPTION.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Chuyển giọng nói thành văn bản trong Poznote (Transcription)

Đọc chính tả trực tiếp vào ghi chú, hoặc chuyển một tệp âm thanh đính kèm thành văn bản, bằng server chuyển giọng nói thành văn bản do bạn tự vận hành.

Poznote không nhúng sẵn mô hình nhận diện giọng nói nào. Hệ thống gửi âm thanh tới một server cung cấp OpenAI audio API, `POST /v1/audio/transcriptions`, chẳng hạn Whisper tự host. Hãy chạy server đó ngay cạnh Poznote để dữ liệu âm thanh không bao giờ rời khỏi máy của bạn.

> [!TIP]
> Tính năng này tách biệt với [AI Assistant](AI-ASSISTANT.vi.md). Hai tính năng được cấu hình độc lập và có thể dùng các server khác nhau, hoặc bạn có thể bật một tính năng mà không bật tính năng kia.

- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Tính năng hoạt động như thế nào](#tính-năng-hoạt-động-như-thế-nào)
- [Cài đặt](#cài-đặt)
- [Chạy server chuyển giọng nói thành văn bản](#chạy-server-chuyển-giọng-nói-thành-văn-bản)
- [Kết nối tới server từ Poznote](#kết-nối-tới-server-từ-poznote)
- [Giới hạn](#giới-hạn)
- [Yêu cầu trình duyệt](#yêu-cầu-trình-duyệt)
- [Server cá nhân](#server-cá-nhân)
- [Quyền riêng tư và dữ liệu được lưu trữ](#quyền-riêng-tư-và-dữ-liệu-được-lưu-trữ)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Gỡ bỏ](#gỡ-bỏ)

## Bắt đầu nhanh

Cách ngắn nhất là chạy [Speaches](https://github.com/speaches-ai/speaches) trong cùng một dự án Docker Compose với Poznote. Mọi lệnh dưới đây đều có thể chạy nguyên văn.

**1. Thêm server vào tệp `docker-compose.yml` của bạn**, dưới dạng một service mới nằm cạnh `webserver`, và khai báo volume của nó ở cuối tệp:

```yaml
services:
  # ... webserver và mcp-server giữ nguyên như cũ ...

  speaches:
    image: ghcr.io/speaches-ai/speaches:latest-cpu
    restart: always
    volumes:
      - "speaches-cache:/home/ubuntu/.cache/huggingface"

volumes:
  speaches-cache:
```

Mục `ports:` được cố tình bỏ trống: Poznote kết nối tới server qua mạng nội bộ của dự án, và không có cổng nào bị mở ra bên ngoài. Xem [tại sao điều này quan trọng](#kết-nối-tới-server-từ-poznote).

**2. Khởi động service:**

```bash
docker compose up -d speaches
```

Dung lượng image khoảng 2 GB.

**3. Tải mô hình.** Khi khởi động lần đầu, Speaches chưa có mô hình nào và cũng không tự động tải về: một yêu cầu chuyển văn bản gọi tới mô hình chưa được tải sẽ thất bại với lỗi `Model '...' is not installed locally`. Hãy tải một mô hình thông qua container Poznote vì chúng đang ở trên cùng một mạng:

```bash
docker compose exec webserver curl -X POST http://speaches:8000/v1/models/Systran/faster-whisper-small
```

Lệnh sẽ trả về `Model 'Systran/faster-whisper-small' downloaded` sau vài giây (khoảng 480 MB). Mô hình được giữ lại trong volume `speaches-cache` qua các lần khởi động lại.

**4. Cấu hình Poznote.** Vào **Settings → Admin Tools → Transcription** và:

- bật **Enable transcription**;
- chọn **Speaches (local)** và đặt URL thành `http://speaches:8000`;
- nhấn **Check access and list models**, sau đó chọn `Systran/faster-whisper-small` ở mục **Model**;
- đánh dấu những người dùng được phép sử dụng (với tư cách quản trị viên, bạn luôn có quyền);
- lưu lại.

**5. Dùng thử.** Tải lại một ghi chú qua HTTPS (hoặc qua `localhost`, xem [yêu cầu trình duyệt](#yêu-cầu-trình-duyệt)), gõ `/dict`, cấp quyền micro, nói, rồi dừng ghi.

## Tính năng hoạt động như thế nào

Sau khi cấu hình, tính năng chuyển giọng nói thành văn bản xuất hiện ở hai nơi.

### Đọc chính tả (Dictate)

Tính năng đọc chính tả nằm ở mục **Record audio**, thuộc **Insert** và **Media** trong menu dấu gạch chéo của mọi ghi chú (cả rich text lẫn Markdown), và trên thanh công cụ chỉnh sửa phía trên bàn phím trên điện thoại. Gõ `/dict`, `/voice` hoặc `/transcribe` sẽ tìm thấy ngay mục này vì bộ lọc tìm cả trong các menu con.

Một hộp thoại sẽ mở ra và quá trình ghi âm bắt đầu khi bạn nhấn **Start**, đây cũng là lúc trình duyệt hỏi quyền truy cập micro lần đầu tiên. Thanh mức âm lượng cho thấy micro đang thực sự thu được âm thanh, và đồng hồ đếm hiển thị thời lượng đã ghi so với thời lượng tối đa do quản trị viên đặt, ví dụ `1:12 / 10:00`.

Khi tính năng chuyển văn bản khả dụng, menu **Spoken language** xuất hiện ngay bên dưới đồng hồ đếm. Menu này khởi đầu ở ngôn ngữ đã thiết lập trong cấu hình (được đánh dấu là mặc định), và việc thay đổi chỉ áp dụng cho bản ghi hiện tại. Tùy chọn **Detect automatically** để server tự nhận diện ngôn ngữ ngay cả khi cấu hình đã đặt sẵn một ngôn ngữ.

Cách xử lý bản ghi được chọn khi bạn dừng ghi âm. **Insert the audio** chèn bản ghi vào ghi chú dưới dạng trình phát âm thanh mà không chuyển thành chữ. **Transcribe** gửi âm thanh tới server, và nút này chỉ hiển thị khi bạn có quyền sử dụng tính năng chuyển văn bản. Khi đạt tới thời lượng tối đa, quá trình ghi âm tự động dừng và chờ bạn chọn một trong hai nút.

Văn bản chuyển đổi trả về trong một ô văn bản để bạn có thể chỉnh sửa trước khi đưa vào ghi chú. **Insert** chèn đoạn chữ vào đúng vị trí con trỏ trước đó. Nếu quá trình chuyển đổi thất bại, cả hai nút sẽ xuất hiện lại để bạn vẫn có thể chèn tệp âm thanh vào ghi chú hoặc gửi lại yêu cầu chuyển đổi.

Hộp kiểm **Also attach the recording to this note** mặc định không được đánh dấu, khi đó bản ghi âm sẽ bị loại bỏ ngay sau khi có văn bản trả về. Hãy đánh dấu mục này nếu muốn lưu thêm bản ghi dưới dạng tệp đính kèm thông thường với tên `dictation-<date>.<ext>`, giúp bạn có thể nghe lại hoặc chuyển đổi lại sau bằng một mô hình tốt hơn.

Nhấn **Cancel**, phím Escape hoặc nhấp ra ngoài hộp thoại sẽ dừng micro và hủy bản ghi, ngay cả khi đang ghi dở dang.

### Chuyển đổi tệp âm thanh đính kèm thành văn bản

Trên trang **Attachments** của mỗi ghi chú, mọi tệp âm thanh đều có thêm một nút micro màu xám nằm giữa nút tải xuống và nút xóa. Nút này rất tiện cho các bản ghi âm giọng nói thu bằng điện thoại rồi tải lên Poznote.

Nhấn nút đó sẽ đưa bạn quay lại ghi chú và mở đúng hộp thoại trên: tệp được chuyển đổi trực tiếp từ kho lưu trữ mà không cần tải lên lại, rồi văn bản hiện ra để bạn kiểm tra. **Insert** chèn văn bản ngay sau tệp đính kèm nếu ghi chú có tham chiếu tới tệp đó, hoặc ở cuối ghi chú nếu không.

Một tệp được xem là âm thanh khi tên tệp kết thúc bằng `mp3`, `wav`, `ogg`, `oga`, `opus`, `m4a`, `flac` hoặc `aac`, hoặc khi loại tệp được ghi nhận là `audio/...`. Phần mở rộng được ưu tiên hơn kiểu MIME vì lý do có chủ đích: ứng dụng Voice Recorder trên Windows tải lên tệp `.m4a` với kiểu `video/mp4`. Các tệp video (`mp4`, `webm`) không được hỗ trợ nút này dù chúng có chứa âm thanh.

Nếu ghi chú đang được mở và chỉnh sửa ở nơi khác, văn bản sẽ không tự động chèn vào: nó vẫn giữ nguyên trong hộp thoại để bạn sao chép.

## Cài đặt

Mọi thiết lập đều nằm tại **Settings → Admin Tools → Transcription** (chỉ dành cho quản trị viên).

| Thiết lập | Tác dụng |
|---|---|
| **Enable transcription** | Công tắc chính cho cấu hình cấp instance bên dưới. |
| **Users allowed** | Các hồ sơ được phép dùng server của instance. Không ai có quyền cho đến khi được đánh dấu, kể cả các hồ sơ mới tạo. Quản trị viên luôn có quyền nên dòng của họ được đánh dấu sẵn và làm mờ. |
| **Transcription server** | Các cấu hình mẫu tự điền URL và ẩn/hiện ô API key: Speaches, whisper.cpp, LocalAI, OpenAI, hoặc Other. |
| **Server URL** | Base URL của server, ví dụ `http://speaches:8000`. Đường dẫn có `/v1` hoặc đầy đủ `/v1/audio/transcriptions` cũng được chấp nhận. |
| **API key** | Gửi dưới dạng `Authorization: Bearer`. Các server cục bộ thường không cần; OpenAI thì bắt buộc. |
| **Check access and list models** | Kiểm tra xem server có phản hồi không và điền danh sách gợi ý mô hình. |
| **Model** | Tên mô hình được gửi kèm trong mỗi yêu cầu. Bắt buộc phải điền với mọi server, kể cả các server bỏ qua trường này. |
| **Spoken language** | Mã hai chữ cái như `en`, `fr` hoặc `de`, hoặc để trống để server tự nhận diện. Hộp thoại ghi âm chọn sẵn giá trị này, và menu trong hộp thoại có thể ghi đè cho một lần ghi cụ thể. |
| **Maximum recording length** | Tính bằng phút, từ 1 đến 60, mặc định là 10. **Record audio** tự dừng khi chạm mốc này, rồi chờ nhấn **Insert the audio** hoặc **Transcribe**. Khi không bật chuyển văn bản, hệ thống sẽ chèn ngay tệp âm thanh. Tệp đính kèm không bị ảnh hưởng bởi giới hạn này. |
| **Allow personal transcription servers** | Cho phép từng người dùng tự thiết lập server riêng, xem [Server cá nhân](#server-cá-nhân). |

### Chọn mô hình

Trường mô hình là ô nhập văn bản tự do kèm gợi ý chứ không phải danh sách thả xuống cố định, vì không phải server nào cũng liệt kê được danh sách mô hình (whisper.cpp không hỗ trợ). Trên Speaches, thao tác kiểm tra chỉ liệt kê các mô hình nhận diện giọng nói và lọc bỏ mọi giọng đọc text-to-speech mà bạn có thể đã tải về.

Mô hình càng lớn thì càng chính xác và chậm hơn. Trên CPU, `small` là điểm cân bằng phổ biến. Sự khác biệt là rất rõ rệt: trên cùng một câu tiếng Pháp, `Systran/faster-whisper-tiny` trả về "ceci est en test de dicter vocale d'opposnade" trong khi `Systran/faster-whisper-small` trả về "ceci est un test de dictée vocale". Các mô hình lớn hơn như `large-v3` xử lý giọng địa phương và tạp âm tốt hơn nữa, nhưng cần GPU để chạy thoải mái.

Để ước lượng hiệu năng trên CPU 4 nhân với `small`: một câu ngắn mất khoảng 6 giây, và yêu cầu đầu tiên sau khi server khởi động mất khoảng 20 giây trong lúc mô hình được nạp vào bộ nhớ. Speaches dùng khoảng 1,5 GB RAM khi đang nạp `small`.

### Ngôn ngữ nói

Hãy để trống **Spoken language** để server tự phát hiện ngôn ngữ, đây là điểm mạnh sẵn có của Whisper. Chỉ cần đặt mã ngôn ngữ cố định khi bạn luôn đọc chính tả bằng một ngôn ngữ duy nhất và các câu ngắn hay bị nhận nhầm sang ngôn ngữ khác.

## Chạy server chuyển giọng nói thành văn bản

Poznote cần một server nhận `POST /v1/audio/transcriptions` dưới dạng multipart form data với các trường `file`, `model`, `response_format=json` và tùy chọn `language`, rồi trả về `{"text": "..."}`.

### Speaches (khuyến nghị)

Đây là lựa chọn đầy đủ nhất: liệt kê được mô hình, giữ được nhiều mô hình cùng lúc, và đọc được WebM (định dạng Chrome và Firefox ghi lại), M4A lẫn WAV mà không cần cấu hình thêm. Mục [Bắt đầu nhanh](#bắt-đầu-nhanh) hướng dẫn thiết lập với Docker Compose.

Quản lý mô hình từ bên trong container Poznote:

```bash
# Xem những mô hình có thể tải về
docker compose exec webserver curl "http://speaches:8000/v1/registry?task=automatic-speech-recognition"

# Tải về, liệt kê, xóa
docker compose exec webserver curl -X POST http://speaches:8000/v1/models/Systran/faster-whisper-small
docker compose exec webserver curl http://speaches:8000/v1/models
docker compose exec webserver curl -X DELETE http://speaches:8000/v1/models/Systran/faster-whisper-small
```

Quá trình tải mô hình cần truy cập Internet từ container Speaches. Quá trình chuyển giọng nói thành văn bản thì không.

Với GPU NVIDIA, hãy dùng image CUDA thay cho `latest-cpu` và cấp quyền truy cập GPU cho service; xem [tài liệu Speaches](https://speaches.ai).

### whisper.cpp

Nhẹ hơn Speaches, chạy mỗi server một mô hình và không có danh sách mô hình. Nó hoạt động tốt với Poznote nhưng chỉ khi truyền đúng các cờ: cấu hình mặc định của nó không mở route theo chuẩn OpenAI, không hỗ trợ ngôn ngữ nào ngoài tiếng Anh, và không nhận định dạng nào ngoài WAV.

**1. Thêm service** vào `docker-compose.yml`:

```yaml
services:
  whisper:
    image: ghcr.io/ggml-org/whisper.cpp:main
    restart: always
    volumes:
      - "whisper-models:/models"
    command: ["/app/build/bin/whisper-server -m /models/ggml-small.bin -l auto --convert --host 0.0.0.0 --port 8080 --inference-path /v1/audio/transcriptions"]

volumes:
  whisper-models:
```

> [!WARNING]
> Giữ `command` dưới dạng danh sách một phần tử, chính xác như trên. Image này chạy lệnh thông qua `bash -c`, nên nếu viết dưới dạng chuỗi thường, lệnh sẽ bị tách thành các đối số riêng lẻ và `bash` sẽ chạy `whisper-server` mà không có bất kỳ cờ nào. Khi đó nó vẫn khởi động âm thầm với các mặc định: chỉ tiếng Anh, chỉ WAV, lắng nghe trên `127.0.0.1` bên trong container tại `/inference`, và log không hề báo có gì bất thường.

**2. Tải một mô hình đa ngôn ngữ** vào volume trước khi khởi động service: server sẽ từ chối chạy nếu thiếu tệp mô hình, còn bản image chỉ đi kèm sẵn `ggml-base.en.bin` vốn chỉ hiểu tiếng Anh.

```bash
docker compose run --rm --entrypoint bash whisper -c "cd /app && ./models/download-ggml-model.sh small /models"
```

**3. Khởi động service:**

```bash
docker compose up -d whisper
```

Ý nghĩa từng cờ cấu hình:

| Cờ | Mặc định | Lý do Poznote cần cờ này |
|---|---|---|
| `-m /models/ggml-small.bin` | `models/ggml-base.en.bin` | Mô hình đi kèm sẵn chỉ hỗ trợ tiếng Anh. |
| `-l auto` | `en` | Nếu thiếu cờ này, lời nói ở các ngôn ngữ khác sẽ bị biến dạng thành chữ tiếng Anh. |
| `--convert` | tắt | Trình duyệt ghi ra WebM, điện thoại tạo ra M4A; nếu thiếu chỉ nhận được WAV. Tính năng này dùng ffmpeg tích hợp sẵn trong image. |
| `--host 0.0.0.0` | `127.0.0.1` | Nếu không đặt, không gì bên ngoài container kết nối tới được. |
| `--inference-path /v1/audio/transcriptions` | `/inference` | Route mà Poznote gọi tới. |

**4. Trong Poznote**, chọn **whisper.cpp (local)**, đặt URL thành `http://whisper:8080`, rồi nhập bất kỳ tên mô hình nào: whisper.cpp bỏ qua tên này và luôn dùng tệp mô hình đã khởi chạy cùng nó, nhưng trường này bắt buộc phải có giá trị. Khi nhấn **Check access and list models**, hệ thống sẽ báo rằng server không liệt kê danh sách mô hình, đây chính là phản hồi bình thường từ một server whisper.cpp đang chạy đúng.

### OpenAI

Chọn **OpenAI**: URL đã được điền sẵn cho bạn, và bắt buộc nhập API key. Hãy dùng một trong các mô hình chuyển văn bản của OpenAI, ví dụ `whisper-1`. Âm thanh sẽ được gửi tới OpenAI.

### LocalAI và các server khác

LocalAI và các server tương thích OpenAI khác hoạt động thông qua cấu hình mẫu **LocalAI** hoặc **Other**, miễn là chúng đáp ứng đúng định dạng yêu cầu nêu ở đầu mục này. Hướng dẫn cài đặt riêng cho từng server không trình bày tại đây; hãy xem tài liệu chính thức của chúng, ví dụ [tài liệu của LocalAI](https://localai.io).

## Kết nối tới server từ Poznote

Poznote gọi tới server chuyển giọng nói thành văn bản từ bên trong container của chính nó, không bao giờ từ trình duyệt của bạn. Vì vậy URL phải truy cập được từ bên trong container Poznote, và `localhost` ở đó có nghĩa là chính container Poznote.

**Khuyến nghị: cùng một mạng Docker, không công bố cổng.** Các service trong cùng một dự án Compose dùng chung một mạng và gọi nhau qua tên service. Đó là cách service `mcp-server` trong `docker-compose.yml` chuẩn kết nối tới `http://webserver:80`, và cũng là cách Poznote kết nối tới `http://speaches:8000` hoặc `http://whisper:8080` ở trên.

> [!CAUTION]
> Đừng thêm `ports: - "8000:8000"` cho server chuyển văn bản trên một máy có IP công khai. Speaches và whisper.cpp mặc định không có xác thực, nên làm vậy sẽ mở miễn phí dịch vụ chuyển giọng nói thành văn bản ra toàn bộ Internet. Gắn cổng về `127.0.0.1:8000:8000` tuy an toàn, nhưng container Poznote lại không kết nối được; dùng chung mạng Docker thì không cần cả hai.

Nếu server chạy như một container `docker run` riêng lẻ, hãy gắn nó vào mạng của Poznote thay vì công bố cổng. Tìm tên mạng bằng lệnh:

```bash
docker inspect <poznote-webserver-container> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

sau đó khởi chạy server với `--network <that-network>` và dùng tên container của nó trong URL.

Với server đặt trên máy khác, hoặc chạy trực tiếp trên Docker host bên ngoài Docker, hãy dùng địa chỉ mà container Poznote truy cập được. Các quy tắc áp dụng giống hệt như với trợ lý AI, xem [Server cục bộ và mạng Docker](AI-ASSISTANT.vi.md#server-cục-bộ-và-mạng-docker).

Để kiểm tra server có phản hồi từ đúng vị trí của Poznote hay không:

```bash
docker compose exec webserver curl http://speaches:8000/v1/models   # Speaches
docker compose exec webserver curl -s -o /dev/null -w '%{http_code}\n' http://whisper:8080/   # whisper.cpp, expect 200
```

## Giới hạn

- **Thời lượng ghi âm:** theo thiết lập **Maximum recording length**, mặc định là 10 phút. Giới hạn này được thực thi ngay trong trình duyệt.
- **Dung lượng tải lên:** tối đa 100 MB cho mỗi bản ghi hoặc tệp đính kèm gửi đi chuyển văn bản.
- **Thời gian chờ chuyển đổi:** Poznote chờ tối đa 570 giây cho phản hồi từ server, ngay dưới ngưỡng 600 giây mà nginx nội bộ của nó cho phép cho một yêu cầu, nhờ vậy một tác vụ chuyển đổi chậm sẽ kết thúc với thông báo dễ đọc thay vì một trang lỗi thô.
- **Thời gian chờ của reverse proxy:** một proxy đứng trước Poznote có thể ngắt kết nối sớm hơn nhiều. nginx mặc định là 60 giây, còn Nginx Proxy Manager là 90 giây. Khi đó một tác vụ chuyển đổi lâu hơn sẽ báo lỗi `HTTP 504`, dù thực tế nó vẫn có thể hoàn thành. Hãy tăng read timeout của proxy cho host Poznote của bạn (với nginx và tab **Advanced** của Nginx Proxy Manager: `proxy_read_timeout 600s;`), hoặc giữ mỗi lần ghi âm đủ ngắn để xử lý xong trong khoảng thời gian đó.

## Yêu cầu trình duyệt

**HTTPS.** Trình duyệt chỉ cấp quyền dùng micro cho một trang trên nguồn an toàn (secure origin): HTTPS, hoặc `localhost`. Trên `http` thuần ở bất kỳ địa chỉ nào khác, **Record audio** sẽ báo cần HTTPS và không ghi được gì. Thao tác chuyển đổi một tệp đính kèm có sẵn không bị ảnh hưởng vì không cần ghi âm.

**Header `Permissions-Policy`.** Poznote gửi `microphone=(self)`, cho phép chính origin của nó và từ chối mọi origin khác. Nếu reverse proxy phía trước tự chèn thêm header `Permissions-Policy` riêng, nó có thể ghi đè thiết lập của Poznote, và một giá trị `microphone=()` ở đó sẽ khiến trình duyệt chặn micro bất kể quyền trang web đã cấp hay chưa. Hộp thoại lúc đó sẽ báo "Poznote was not allowed to use the microphone". Hãy gỡ header này ở phía proxy, hoặc cũng đặt `microphone=(self)` tại đó.

## Server cá nhân

Quản trị viên có thể đánh dấu **Allow personal transcription servers**. Khi đó mỗi người dùng sẽ có thẻ **My transcription server** trong phần cài đặt riêng của mình với các trường server, URL, API key, mô hình và ngôn ngữ tương tự. Khi người dùng bật mục này, âm thanh của họ sẽ đi tới server riêng thay cho server cấp instance, bất kể họ có nằm trong danh sách người dùng được phép hay không.

Thời lượng ghi âm tối đa vẫn tuân theo thiết lập của quản trị viên.

Các API key cá nhân được mã hóa khi lưu trữ bằng secret của instance, tương tự khóa của AI assistant và Git Sync.

## Quyền riêng tư và dữ liệu được lưu trữ

Bản ghi âm được tải lên Poznote rồi từ đó chuyển tiếp tới server chuyển văn bản. Thiết kế này là có chủ đích: server chuyển văn bản thường nằm trong một mạng mà trình duyệt không chạm tới được, và API key của nó không bao giờ được phép truyền xuống trang web.

Poznote không giữ bản sao nào. Dữ liệu âm thanh chỉ nằm trong tệp tải lên tạm thời của PHP trong suốt một yêu cầu, trừ khi bạn đánh dấu **Also attach the recording to this note** để lưu nó thành tệp đính kèm thông thường tính vào dung lượng lưu trữ của bạn.

Khi thiết lập Speaches hoặc whisper.cpp như hướng dẫn ở trên, mọi thứ đều được xử lý trên máy của bạn và không có dữ liệu nào đi ra ngoài Internet:

- Trình duyệt ghi âm bằng MediaRecorder, không dùng bộ nhận diện giọng nói tích hợp sẵn của trình duyệt (vốn có thể gửi âm thanh tới Google hoặc Apple).
- Bản ghi chỉ đi tới server Poznote của bạn, và Poznote chỉ chuyển tiếp tới đúng URL đặt trên trang Transcription. Không có máy chủ nào khác được liên hệ.
- Lần truy cập Internet duy nhất là lúc tải mô hình, một lần khi cài đặt. Việc chuyển giọng nói thành văn bản vẫn hoạt động bình thường khi container bị ngắt hoàn toàn khỏi Internet.
- Văn bản chuyển đổi đi thẳng vào ghi chú của bạn như chữ bạn tự gõ, và không lưu ở nơi nào khác.

> [!WARNING]
> Cấu hình mẫu **OpenAI** là ngoại lệ: mọi bản ghi âm được gửi tới các máy chủ của OpenAI. Đây là cấu hình mẫu duy nhất làm vậy, và cũng là cấu hình duy nhất có URL cố định và bị ẩn đi. Nếu trang Transcription có hiển thị ô URL, âm thanh chỉ nằm lại trong server tại URL đó.

## Khắc phục sự cố

**"Poznote was not allowed to use the microphone", nhưng trình duyệt báo là đã cho phép**
Có thành phần nào đó đã từ chối trước khi trình duyệt xét tới quyền của trang. Kiểm tra header trả về tới trình duyệt:

```bash
curl -sI https://your-poznote/login.php | grep -i permissions-policy
```

Kết quả phải là `microphone=(self)`. Xem [Yêu cầu trình duyệt](#yêu-cầu-trình-duyệt).

**"The microphone needs HTTPS"**
Bạn đang truy cập qua `http` thuần tại một địa chỉ không phải `localhost`. Hãy phục vụ Poznote qua HTTPS.

**Không có nút Transcribe khi ghi âm**
Tính năng chuyển văn bản đang tắt, hồ sơ của bạn chưa nằm trong danh sách người dùng được phép, hoặc cấu hình chưa có URL hay chưa có mô hình. Nút **Record audio** thì luôn có mặt dưới **Insert** và **Media**; gõ `/dict` sẽ tìm thấy.

**Không có nút micro trên tệp đính kèm**
Tệp không được nhận diện là âm thanh (xem danh sách trong [Chuyển đổi tệp âm thanh đính kèm thành văn bản](#chuyển-đổi-tệp-âm-thanh-đính-kèm-thành-văn-bản)), hoặc tính năng chuyển văn bản chưa được mở cho hồ sơ của bạn.

**"Failed to connect to ..."**
URL bị sai, server chưa chạy, hoặc server không nằm trên mạng mà Poznote tiếp cận được. Xem [Kết nối tới server từ Poznote](#kết-nối-tới-server-từ-poznote).

**"HTTP 404: Model '...' is not installed locally"**
Speaches chưa tải mô hình đó về. Hãy tải mô hình, xem bước 3 của [Bắt đầu nhanh](#bắt-đầu-nhanh).

**"HTTP 404" khi kiểm tra kết nối với whisper.cpp**
Hãy chọn cấu hình mẫu **whisper.cpp** thay vì **Other**: whisper.cpp không cung cấp danh sách mô hình, và chỉ cấu hình mẫu của nó mới hiểu phản hồi 404 đó là server đang hoạt động bình thường. Nếu chính quá trình chuyển đổi cũng trả về 404, server đang chạy mà thiếu `--inference-path /v1/audio/transcriptions`, nguyên nhân thường là do `command` được viết dưới dạng chuỗi thường; xem cảnh báo trong mục [whisper.cpp](#whispercpp).

**Giọng nói tiếng Pháp (hoặc ngôn ngữ khác tiếng Anh) bị trả về thành tiếng Anh, hoặc thành chuỗi vô nghĩa**
whisper.cpp đang chạy thiếu `-l auto`, hoặc đang dùng mô hình đi kèm `ggml-base.en.bin`. Hãy dùng mô hình đa ngôn ngữ cùng cờ `-l auto`.

**Ghi âm thất bại nhưng tệp WAV lại hoạt động trên whisper.cpp**
Thiếu cờ `--convert`.

**"HTTP 504" với các bản ghi dài hơn**
Reverse proxy đã ngắt yêu cầu trước khi quá trình chuyển văn bản kịp hoàn tất. Xem mục thời gian chờ của reverse proxy trong [Giới hạn](#giới-hạn).

**"The transcription server did not answer within 570 seconds"**
Bản ghi quá dài đối với mô hình này trên phần cứng hiện tại. Hãy ghi mỗi lần ngắn hơn, giảm **Maximum recording length**, hoặc dùng mô hình nhỏ hơn hay chạy trên GPU.

**"The server heard nothing in this recording"**
Whisper trả về chuỗi rỗng, đó là phản hồi bình thường của nó đối với khoảng lặng. Hãy quan sát thanh mức âm lượng trong khi ghi: nếu thanh này không bao giờ nhúc nhích, trình duyệt đang dùng nhầm thiết bị đầu vào.

**"This note cannot be edited from here right now"**
Ghi chú đang được chỉnh sửa ở nơi khác nên văn bản không được tự chèn. Hãy sao chép văn bản từ hộp thoại, hoặc đóng trình soạn thảo kia lại rồi thử lại.

**Lần chuyển đổi đầu tiên chậm, các lần tiếp theo nhanh**
Server cần nạp mô hình vào bộ nhớ ở lần sử dụng đầu tiên, mất khoảng 20 giây đối với `small` trên CPU.

## Gỡ bỏ

Tắt **Enable transcription** trong phần cài đặt, rồi xóa service khỏi `docker-compose.yml` và chạy:

```bash
docker compose rm -sf speaches                 # or: whisper
docker volume rm <project>_speaches-cache      # or: <project>_whisper-models
```

Lệnh `docker volume ls` sẽ hiển thị chính xác tên volume có gắn tiền tố tên dự án của bạn.
