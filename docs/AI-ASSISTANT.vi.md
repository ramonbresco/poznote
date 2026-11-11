<!-- lang-selector -->
<p align="center">
  <a href="AI-ASSISTANT.md">English</a> ·
  <a href="AI-ASSISTANT.fr.md">Français</a> ·
  <a href="AI-ASSISTANT.de.md">Deutsch</a> ·
  <a href="AI-ASSISTANT.es.md">Español</a> ·
  <a href="AI-ASSISTANT.pt.md">Português</a> ·
  <a href="AI-ASSISTANT.ru.md">Русский</a> ·
  <a href="AI-ASSISTANT.zh-cn.md">简体中文</a> ·
  <a href="AI-ASSISTANT.ko.md">한국어</a> ·
  <a href="AI-ASSISTANT.ja.md">日本語</a> ·
  <a href="AI-ASSISTANT.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Trợ lý AI của Poznote

Trò chuyện AI tích hợp có thể tìm kiếm và đọc ghi chú của bạn. Tính năng này hoạt động với instance [Ollama](https://ollama.com) hoặc [LM Studio](https://lmstudio.ai) cục bộ, nhà cung cấp đám mây như [Anthropic (Claude)](https://www.anthropic.com) hoặc OpenAI, hay bất kỳ server nào tương thích chuẩn OpenAI.

> [!TIP]
> Bạn muốn kết nối một trợ lý AI *bên ngoài* (như VS Code Copilot, Claude CLI...) tới ghi chú của mình? Hãy xem [tài liệu MCP Server](MCP-SERVER.vi.md).

## Trợ lý làm được gì

Sau khi cấu hình, nút **AI assistant** sẽ xuất hiện trên thanh biểu tượng bên trái ở trang ghi chú và trang dashboard, giúp mở khung chat ngay tại chỗ. Khung chat được neo bên phải, giữ nguyên trạng thái đóng/mở và độ rộng khi chuyển giữa hai trang, và cuộc hội thoại cũng theo bạn xuyên suốt hai trang đó.

Trợ lý có các công cụ để **tìm kiếm và đọc ghi chú của bạn**, và tự động gọi chúng: hãy hỏi "ghi chú của tôi nói gì về X?", yêu cầu tóm tắt nhiều ghi chú, hoặc nhờ tìm lại ghi chú bạn chỉ nhớ mang máng. Câu trả lời được stream trực tiếp và hiển thị dưới dạng Markdown.

Trợ lý cũng có thể **xem hình ảnh trong ghi chú của bạn**. Dán, kéo thả hoặc đính kèm một ảnh vào ghi chú, rồi hỏi bức ảnh thể hiện gì, nhãn trên ảnh viết gì, hoặc nhờ chép lại chi tiết vào ghi chú: trợ lý sẽ yêu cầu xem ảnh và đọc nội dung ảnh. Hỗ trợ các định dạng PNG, JPEG, GIF và WebP, dù là tệp đính kèm hay nhúng trong ghi chú, tối đa 4 ảnh cho một câu trả lời, mỗi ảnh tối đa 5 MB và tổng cộng tối đa 8 MB; sơ đồ Excalidraw, SVG và PDF không thể xem trực tiếp theo cách này. Tính năng này cần mô hình hỗ trợ nhận diện hình ảnh, xem mục **Chọn mô hình** bên dưới. Mọi chữ viết bên trong hình ảnh được xử lý thuần túy như dữ liệu chứ không bao giờ được xem là chỉ thị thực thi: một bức ảnh chứa dòng lệnh bảo trợ lý xóa ghi chú sẽ được báo lại cho bạn chứ không làm theo.

Khi bạn yêu cầu rõ ràng, trợ lý cũng có thể thao tác trên ghi chú của bạn:

- **viết**: tạo ghi chú mới, đổi tên ghi chú, hoặc viết lại nội dung;
- **tổ chức**: thêm hoặc gỡ tag, liệt kê, tạo và đổi tên thư mục, di chuyển ghi chú giữa các thư mục, đánh dấu ghi chú và thư mục là mục yêu thích;
- **ngày giờ**: đặt hoặc gỡ lời nhắc trên ghi chú (một lần hoặc lặp lại), với ngày giờ hiện tại theo múi giờ của bạn đã được cung cấp sẵn cho trợ lý, nên câu lệnh kiểu "nhắc tôi vào thứ Hai tuần tới lúc 9 giờ" hoạt động chính xác;
- **công việc (tasks)**: thêm, đánh dấu hoàn thành, bỏ đánh dấu, đổi tên hoặc xóa các task trong ghi chú danh sách công việc cùng các subtask của chúng, bao gồm hạn hoàn thành và lời nhắc của task, cũng như tick hoặc bỏ tick hộp kiểm trong ghi chú thông thường mà không phải viết lại phần còn lại;
- **xóa**: chuyển một ghi chú vào thùng rác, hoặc cả một thư mục gồm các thư mục con và toàn bộ ghi chú bên trong. Mọi thứ đều có thể khôi phục từ trang Trash: trợ lý không có cách nào xóa vĩnh viễn dữ liệu và không có công cụ dọn sạch thùng rác.

Ghi chú bạn đang mở là một phần của ngữ cảnh: chỉ cần nói "cải thiện định dạng cho ghi chú này" hoặc "thêm phần kết luận ở đây" và trợ lý sẽ xử lý trực tiếp ghi chú đó mà không cần id hay tiêu đề. Thay đổi bạn vừa gõ hoặc dán sẽ được tự động lưu trước khi tin nhắn gửi đi, vì vậy trợ lý luôn đọc đúng trạng thái bạn đang thấy, và "ghi chú này" sẽ cập nhật theo nếu bạn mở sang ghi chú khác trong lúc trò chuyện. Nếu bạn nêu rõ tên một ghi chú khác trong câu hỏi thì tên đó vẫn được ưu tiên. Trên trang dashboard không có ghi chú nào đang mở, nên hãy nêu tên ghi chú bạn muốn nhắc tới.

Hai dòng phía trên ô nhập liệu cho biết trợ lý đang làm việc với gì: **workspace** mà mọi công cụ sẽ chạy trong đó, và **note** mà cụm từ "ghi chú này" trỏ tới khi có ghi chú đang mở.

Khi trợ lý chỉnh sửa hoặc tạo ghi chú, ghi chú đang mở và thanh bên sẽ tự làm mới sau khi câu trả lời hoàn tất mà không cần tải lại trang. Nếu ghi chú vừa được trợ lý sửa đang có thay đổi chưa lưu của bạn, một biểu ngữ sẽ hiện ra để bạn chọn tải lại ghi chú hoặc giữ và lưu phiên bản của riêng mình.

Trợ lý đọc và ghi nội dung ghi chú dưới dạng Markdown. Ghi chú dạng rich-text (HTML) được chuyển đổi tức thời theo cả hai chiều bằng cùng bộ chuyển đổi với thao tác **Convert note**, nên khi viết lại vẫn giữ được tiêu đề, danh sách, liên kết, bảng và hình ảnh; các định dạng kiểu chữ như màu chữ hay phông chữ sẽ không được giữ lại. Trợ lý đọc ghi chú dài thành nhiều phần. Để sửa vài chỗ, trợ lý chỉ thay thế đúng các đoạn đó bất kể ghi chú dài bao nhiêu. Để viết lại toàn bộ một ghi chú dài, trợ lý bắt buộc phải đọc hết trước, nếu không yêu cầu viết lại sẽ bị từ chối thay vì bị cắt xén, và phiên bản mới phải nằm gọn trong một câu trả lời của mô hình.

Trước khi trợ lý thay đổi nội dung một ghi chú (viết lại, đánh dấu hộp kiểm, cập nhật task), Poznote tự động lưu một bản sửa đổi (revision) của phiên bản hiện tại, gắn nhãn "Before AI edit" trên trang **Revisions** của ghi chú (biểu tượng lịch sử trên thanh công cụ ghi chú). Nếu kết quả chưa đúng ý, bạn có thể khôi phục bản sửa đổi đó, hoặc mở tab Changes trước để xem trợ lý đã sửa những gì. Hệ thống sẽ bỏ qua không lưu thêm bản mới nếu bản sửa đổi mới nhất đã có cùng nội dung, một câu trả lời sửa cùng một ghi chú nhiều lần cũng chỉ lưu một bản, và tối đa 20 bản sửa đổi an toàn gần nhất (Before AI edit và Before MCP edit) được giữ cho mỗi ghi chú; con số này có thể điều chỉnh trong **Settings → Revisions** (từ 1 đến 200).

Trợ lý hoạt động **trong phạm vi workspace hiện tại**: trợ lý chỉ nhìn thấy, tìm kiếm và chỉnh sửa các ghi chú thuộc workspace nơi bạn mở khung chat, và các ghi chú mới cũng được tạo tại đó. Để hỏi về workspace khác, hãy chuyển sang workspace đó trước. Trên dashboard hiển thị nhiều workspace, trợ lý tìm kiếm và đọc ghi chú của tất cả các workspace cùng lúc, đây là cách để đặt câu hỏi xuyên suốt nhiều workspace. Tuy nhiên ở chế độ đó trợ lý chỉ có quyền đọc: không tạo, sửa, sắp xếp hay xóa gì cả, nên muốn sửa một ghi chú tìm được hãy mở ghi chú hoặc workspace của nó rồi yêu cầu tại đó.

Các cuộc hội thoại được lưu trên server Poznote, trong chính cơ sở dữ liệu riêng của bạn cạnh ghi chú, và chỉ thuộc về riêng bạn: người dùng chung một workspace được chia sẻ với bạn sẽ có lịch sử hội thoại riêng của họ. Ở phần đầu khung chat, nút dấu cộng tạo cuộc hội thoại mới và nút lịch sử liệt kê 10 cuộc hội thoại gần nhất của workspace để tiếp tục hoặc xóa; nút thùng rác xóa cuộc hội thoại đang mở trên màn hình. Lịch sử hội thoại đồng bộ theo bạn giữa các trình duyệt hoặc thiết bị, và tải lại trang sẽ khôi phục lại đúng cuộc hội thoại tab đó đang mở.

## Bật trợ lý AI

Vào **Settings → Admin Tools → AI Assistant** (chỉ dành cho quản trị viên) và chọn nhà cung cấp:

| Nhà cung cấp | URL | API key |
|---|---|---|
| **Ollama** (cục bộ) | Phụ thuộc nơi Ollama chạy (container hoặc host), xem [Server cục bộ và mạng Docker](#server-cục-bộ-và-mạng-docker) | Không cần |
| **LM Studio** (cục bộ) | Tự điền sẵn địa chỉ Docker host của bạn, cổng `1234`, xem [Tùy chọn 2](#tùy-chọn-2-ollama-cài-đặt-trên-máy-host) | Không cần |
| **Anthropic** (đám mây) | Tự động thiết lập | Bắt buộc |
| **OpenAI** (đám mây) | Tự động thiết lập | Bắt buộc |
| **Custom** | Bất kỳ base URL nào tương thích OpenAI | Tùy thuộc vào server |

Sau đó nhấn **Check access and list models** để kiểm tra khả năng kết nối tới server và nạp danh sách mô hình vào ô chọn **Model**. Danh sách này sẽ trống cho đến khi bước kiểm tra thành công, vì vậy đây là bước giúp bạn chọn được mô hình.

Cấu hình này áp dụng cho toàn bộ instance, nhưng quyền truy cập được cấp theo từng hồ sơ người dùng: cùng trang đó có danh sách **Users allowed to use the global AI assistant**, và chỉ những người dùng được đánh dấu mới thấy khung chat. Người dùng mới chưa có quyền cho đến khi quản trị viên thêm vào. Quản trị viên luôn có quyền truy cập nên dòng của họ được đánh dấu sẵn và làm mờ.

### API key cá nhân

Cùng trang đó có tùy chọn **Allow personal API keys**. Khi bật tùy chọn này, mỗi người dùng sẽ có thẻ **My AI Assistant** trong phần cài đặt riêng của mình để trỏ khung chat tới server, nhà cung cấp và API key của riêng họ thay cho cấu hình dùng chung của instance.

## Chọn mô hình

Hãy chọn một mô hình hỗ trợ **tool calling** (còn gọi là "function calling"), ví dụ `qwen3`, `llama3.1` hoặc `mistral`. Tool calling là tính năng giúp trợ lý duyệt và thao tác ghi chú của bạn: nếu dùng mô hình không hỗ trợ, khung chat vẫn hoạt động (có thông báo nhắc bạn) nhưng không thể tự truy cập ghi chú.

Để trợ lý **xem được hình ảnh trong ghi chú**, mô hình cũng phải hỗ trợ đầu vào hình ảnh (mô hình "vision" hoặc "multimodal"). Phần lớn mô hình đám mây của OpenAI, Anthropic và Google đều đọc được ảnh; trên Ollama bạn cần chọn mô hình có hỗ trợ, chẳng hạn `qwen2.5vl` hoặc `llava`. Không có API tương thích OpenAI nào báo trước cho Poznote biết một mô hình có nhận ảnh hay không, nên trợ lý sẽ thử gửi: với mô hình chỉ nhận văn bản, một thông báo sẽ xuất hiện trong khung chat và câu trả lời được tạo mà không có hình ảnh.

### Mức độ suy luận (Reasoning effort)

Các mô hình suy luận (OpenAI GPT-5 và dòng o, `gpt-oss` trên Ollama, ...) nhận tham số **reasoning effort** để điều chỉnh thời gian mô hình suy luận trước khi trả lời. Trường **Reasoning effort** trong trang cài đặt điều khiển giá trị này: **Auto** (mặc định) không gửi tham số này và để nhà cung cấp tự quyết định, trong khi **None**, **Minimal**, **Low**, **Medium**, **High** và **Very high** sẽ được gửi dưới dạng tham số `reasoning_effort` trong mọi yêu cầu. Những giá trị mô hình không hỗ trợ sẽ bị nhà cung cấp từ chối và báo lỗi trong khung chat.

Một số mô hình OpenAI từ chối tool calling trên chat completions API trừ khi mức độ suy luận là `none`. Khi đó khung chat sẽ hiện thông báo trợ lý không thể duyệt ghi chú của bạn: hãy đặt **Reasoning effort** thành **None** để dùng lại các công cụ.

### Custom headers

Một gateway đặt trước các mô hình (LiteLLM, OpenRouter, Cloudflare AI Gateway, Helicone, ...) thường yêu cầu các HTTP header riêng để định danh người gọi hoặc thống kê mức sử dụng. Trường **Custom headers** trong trang cài đặt cho phép nhập các header đó, mỗi dòng một header theo định dạng `Name: value`:

```
x-litellm-customer-id: poznote
```

Các header này được gửi kèm mọi yêu cầu tới server AI, bao gồm cả bước kiểm tra kết nối. Trường này có sẵn cho mọi nhà cung cấp, cả ở cấu hình cấp instance lẫn cấu hình cá nhân. Với Anthropic, một API key cấp tổ chức chưa gắn phạm vi workspace cần thêm `anthropic-workspace-id: wrkspc_...`. Với OpenAI, `OpenAI-Organization` và `OpenAI-Project` dùng để chọn tổ chức hoặc dự án thanh toán.

Giá trị được lưu dưới dạng mã hóa và không bao giờ hiển thị lại: một header đã lưu sẽ hiện dạng `Name: ••••••••`. Giữ nguyên dòng đó để bảo toàn giá trị, nhập lại giá trị mới để thay đổi, hoặc xóa dòng để gỡ bỏ header.

Các header điều khiển khung truyền của yêu cầu (`Host`, `Content-Type`, `Content-Length`, `Accept`, ...) sẽ bị từ chối, tương tự với `Authorization` vốn do trường **API key** đảm nhiệm. Với Anthropic, `x-api-key` và `anthropic-version` cũng bị từ chối vì Poznote tự thiết lập chúng. Tên và giá trị chỉ nhận ký tự ASCII chuẩn, tối đa 20 header.

Mỗi yêu cầu cũng mang theo `User-Agent: Poznote/<version>`, giúp log của gateway nhận diện được nguồn gửi. Nếu có dòng `User-Agent` trong custom headers thì giá trị đó sẽ ghi đè mặc định này.

## Chỉ thị tùy chỉnh (Custom instructions)

Mỗi người dùng có thể đặt chỉ thị cố định cho trợ lý trong **Settings → My AI Assistant → Custom instructions**, ví dụ "Khi viết ghi chú bằng tiếng Anh, hãy thêm bản dịch tiếng Việt bên dưới và ngược lại". Đoạn văn bản này (tối đa 4000 ký tự) được gửi tới mô hình cùng mọi tin nhắn, bất kể dùng cấu hình của instance hay cấu hình cá nhân của bạn. Hãy dùng mục này cho các thiết lập lâu dài như giọng văn, ngôn ngữ hoặc bố cục ghi chú do trợ lý viết. Nó không thay đổi quyền hạn của trợ lý: ghi chú vẫn chỉ bị sửa khi bạn yêu cầu. Để trống ô này nếu không muốn gửi gì thêm.

## Prompt đã lưu (Saved prompts)

Những prompt bạn thường xuyên dùng, chẳng hạn "Kiểm tra ngữ pháp và cấu trúc của ghi chú này rồi đề xuất cải thiện" hoặc "Tôi nên hỏi thêm những câu hỏi tiếp theo nào?", có thể được lưu trong **Settings → My AI Assistant → Saved prompts**: mỗi prompt gồm một tên và nội dung, tối đa 30 prompt. Trong khung chat, nút tia sét cạnh ô nhập liệu mở danh sách này, và nhấp vào một mục sẽ gửi nội dung đó làm tin nhắn của bạn, áp dụng cho ghi chú đang mở nếu có nhắc "ghi chú này". Nội dung bạn đang gõ dở vẫn được giữ nguyên trong ô nhập. Khác với chỉ thị tùy chỉnh, prompt đã lưu chỉ được gửi khi bạn chọn. Mục **Manage saved prompts** ở cuối danh sách sẽ mở phần cài đặt. Để xóa một prompt, nhấp vào biểu tượng thùng rác hoặc xóa trắng nội dung rồi lưu lại.

## Công cụ bên ngoài (MCP servers)

Trợ lý có thể gọi các công cụ do [MCP](https://modelcontextprotocol.io) server từ xa cung cấp bên cạnh công cụ sẵn có của Poznote, ví dụ dịch vụ tìm kiếm web, để tra cứu thông tin mới nhất trước khi trả lời hoặc viết ghi chú. Đây là chiều ngược lại của [Poznote MCP server](MCP-SERVER.vi.md), vốn cho phép các trợ lý bên ngoài kết nối vào ghi chú của bạn.

Tính năng này mặc định tắt. Quản trị viên bật trong **Settings → Admin Tools → AI Assistant**, mục **External tools**, bằng tùy chọn **Allow external tools**, sau đó thêm các server tại đây: gồm tên, URL của endpoint MCP (ví dụ `https://mcp.exa.ai/mcp`), API key tùy chọn gửi dưới dạng Bearer token, và custom headers tùy chọn cho các server nhận khóa theo cách khác. Poznote kết nối tới server, đọc danh sách công cụ cung cấp và liệt kê kèm hộp kiểm cho từng công cụ để bạn chọn những công cụ trợ lý được phép gọi. Các server này được cung cấp cho những người dùng có quyền sử dụng trợ lý cấp instance. Nếu bật **Allow users to connect their own servers**, mỗi người dùng còn có thêm mục **External tools** trong **Settings → My AI Assistant** cho các server chỉ dùng trong hội thoại của riêng họ.

Chỉ hỗ trợ các server kết nối qua HTTP (giao thức truyền tải Streamable HTTP) sử dụng API key hoặc custom headers: các server chạy dưới dạng tiến trình cục bộ (stdio, `npx ...`) và server yêu cầu OAuth không được hỗ trợ. Giống như server AI, MCP server được gọi từ phía server Poznote, nên URL của nó phải truy cập được từ bên trong container. Danh sách công cụ được đọc khi bạn thêm server và khi nhấn **Check and refresh tools**: nếu server thêm hoặc đổi mô tả công cụ sau đó, thay đổi chỉ có hiệu lực sau khi bạn làm mới.

Khi đã kết nối một server, nút hình quả địa cầu sẽ hiện cạnh ô nhập chat để bật/tắt nhanh các công cụ bên ngoài, và lựa chọn này được nhớ trong trình duyệt của bạn. Mọi lần gọi công cụ đều được hiển thị trong cuộc hội thoại cùng tên server, tên công cụ và dữ liệu đã gửi.

Dữ liệu mà một công cụ bên ngoài trả về đến từ bên ngoài Poznote, ví dụ một trang web, nên có thể chứa văn bản cố tình đánh lừa mô hình. Trợ lý được chỉ thị xem dữ liệu đó thuần túy như dữ liệu và một bản sửa đổi luôn được lưu trước khi sửa bất kỳ ghi chú nào, nhưng chỉ thị nhắc mô hình không phải là bảo đảm tuyệt đối. Để loại trừ khả năng thay đổi ngoài ý muốn, hãy mở **Settings → My AI Assistant**, mục **Assistant tools**, và bỏ chọn các công cụ trong danh sách **Changing your notes**: khi đó trợ lý vẫn đọc được ghi chú của bạn và tìm kiếm web, nhưng không còn quyền sửa bất cứ thứ gì. Cũng hãy lưu ý rằng những gì trợ lý gửi cho công cụ bên ngoài sẽ đi ra khỏi instance của bạn.

## Server cục bộ và mạng Docker

Server AI được gọi **từ phía server Poznote**, không bao giờ từ trình duyệt của bạn. Vì Poznote chạy trong Docker container, URL bạn cấu hình phải truy cập được *từ bên trong container đó*.

Với Ollama cục bộ, có **hai cách thiết lập khả thi**, đều được hỗ trợ đầy đủ:

| Cách thiết lập | URL cần cấu hình | Cấu hình mạng |
|---|---|---|
| [**Tùy chọn 1**: Ollama chạy dưới dạng Docker container](#tùy-chọn-1-ollama-chạy-dưới-dạng-docker-container-đơn-giản-nhất) | `http://ollama:11434` | Không cần |
| [**Tùy chọn 2**: Ollama cài đặt trên máy host](#tùy-chọn-2-ollama-cài-đặt-trên-máy-host) | Địa chỉ máy host của bạn nhìn từ trong container | Bắt buộc, đây là phần hay gây vướng nhất |

Chọn tùy chọn 1 nếu bạn cài đặt mới từ đầu. Chọn tùy chọn 2 nếu Ollama đã được cài sẵn trên máy hoặc đang dùng chung cho các ứng dụng khác.

### Tùy chọn 1: Ollama chạy dưới dạng Docker container (đơn giản nhất)

Cách dễ nhất là không đụng tới mạng máy host: thêm Ollama thành một service nữa trong chính tệp `docker-compose.yml` của Poznote:

```yaml
  ollama:
    image: ollama/ollama
    container_name: ollama
    restart: always
    volumes:
      - "./ollama:/root/.ollama"
```

sau đó khởi động container và kéo một mô hình về:

```bash
docker compose up -d
docker exec ollama ollama pull qwen3
```

Trong phần cài đặt AI Assistant, thay URL điền sẵn bằng `http://ollama:11434`. Các service trong cùng tệp compose dùng chung một mạng Docker và gọi nhau trực tiếp qua tên service, nên không cần cấu hình gì thêm: không cần mở port, không cần đặt `OLLAMA_HOST`, và Ollama cũng không bị lộ ra ngoài mạng Docker. Nếu tệp compose của bạn định nghĩa `networks` riêng, hãy đưa `ollama` vào cùng mạng với service của Poznote.

Để tăng tốc bằng GPU bên trong container, xem [tài liệu Docker image của Ollama](https://hub.docker.com/r/ollama/ollama).

### Tùy chọn 2: Ollama cài đặt trên máy host

Nếu Ollama chạy trực tiếp trên máy host (cài đặt chuẩn từ [ollama.com](https://ollama.com)), hoặc nếu bạn dùng LM Studio, Poznote vẫn kết nối được, nhưng container phải đi ngược ra máy host thông qua mạng Docker. Các mục nhỏ dưới đây giải thích cách làm.

#### Tại sao `localhost` không hoạt động

`http://localhost:11434` hay `http://127.0.0.1:11434` sẽ **không** chạy được: bên trong container, `localhost` là chính container đó chứ không phải máy đang chạy Ollama. Docker cấp cho mỗi container một ngăn xếp mạng cô lập riêng: cùng một máy vật lý, nhưng là hai "localhost" khác nhau.

Để tới được máy host, container phải đi qua **gateway** của mạng Docker, tức là một địa chỉ IP thuộc về máy host.

#### Tìm đúng địa chỉ URL

Poznote tự điền sẵn vào ô URL địa chỉ Docker host dự đoán tốt nhất theo thứ tự sau:

1. `host.docker.internal` nếu tên này phân giải được bên trong container (luôn có sẵn trên Docker Desktop cho Windows/macOS; trên Linux chỉ có nếu bạn ánh xạ thêm, xem bên dưới);
2. nếu không sẽ lấy IP default gateway của container (ví dụ `http://172.17.0.1:11434`), đọc từ bảng định tuyến của container.

URL điền sẵn thường chạy ngay được. Nếu cần tự kiểm tra từ máy host:

```bash
docker exec <poznote-webserver-container> ip route | grep default
# default via 172.17.0.1 dev eth0   ← gateway IP là máy host của bạn nhìn từ trong container
```

Trên Linux, bạn có thể làm cho `host.docker.internal` dùng được (giống Docker Desktop) bằng cách thêm đoạn sau vào service `webserver` trong `docker-compose.yml`:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

rồi chạy `docker compose up -d`. URL khi đó là `http://host.docker.internal:11434`, ổn định và giống nhau trên mọi máy.

#### Cấu hình để Ollama lắng nghe kết nối từ container

Mặc định Ollama chỉ lắng nghe trên `127.0.0.1` (loopback của máy host), khiến mọi container đều không kết nối tới được dù đã dùng đúng IP gateway. Bạn cần đặt `OLLAMA_HOST` để Ollama lắng nghe trên một giao diện mạng mà container tiếp cận được.

Với bản cài chuẩn trên Linux (systemd):

```bash
sudo systemctl edit ollama
```

thêm nội dung:

```ini
[Service]
Environment="OLLAMA_HOST=172.17.0.1:11434"
```

sau đó chạy:

```bash
sudo systemctl restart ollama
```

Nên bind vào địa chỉ nào:

- **`172.17.0.1` (cầu nối `docker0`, khuyến nghị trên Linux)**: mọi container đều truy cập được, có sẵn trên mọi bản cài Docker và không lộ ra ngoài Internet. Kiểm tra IP `docker0` của bạn bằng `ip addr show docker0` (mặc định là `172.17.0.1` trừ khi bạn tùy chỉnh dải địa chỉ Docker).
- **`0.0.0.0`** (mọi giao diện mạng): đơn giản nhất, nhưng sẽ mở Ollama trên **tất cả** giao diện mạng của máy. Ollama không có cơ chế xác thực, nên nếu máy bạn có IP công khai, chỉ dùng cách này sau tường lửa đã chặn cổng đó (ví dụ `ufw deny 11434`). Với máy ở nhà sau NAT thì an toàn.
- Địa chỉ gateway của một mạng Compose cụ thể (ví dụ `192.168.48.1`): vẫn chạy được, nhưng các subnet này do Docker cấp tự động lúc tạo mạng và có thể đổi khi mạng được tạo lại, nên cần tránh.

Trên Docker Desktop (Windows/macOS) với Ollama chạy trên máy host, `OLLAMA_HOST=0.0.0.0` là lựa chọn thông dụng; máy cá nhân thường không mở trực tiếp ra ngoài, và `host.docker.internal` sẽ kết nối được ngay.

**LM Studio** hoạt động tương tự: trong phần cài đặt server, hãy bật "Serve on Local Network" (tương đương bind `0.0.0.0`), nếu không nó sẽ chỉ lắng nghe trên `127.0.0.1`.

#### Kiểm tra kết nối

Từ máy host, kiểm tra xem Ollama thực sự đang lắng nghe ở đâu:

```bash
ss -tlnp | grep 11434
```

và thử gọi đúng URL mà Poznote sẽ dùng từ bên trong container:

```bash
docker exec <poznote-webserver-container> curl -s -m 3 http://172.17.0.1:11434/
# "Ollama is running"
```

Nếu lệnh này không trả về gì, nguyên nhân nằm ở thiết lập bind của Ollama hoặc tường lửa chứ không phải do Poznote. Nút **Check access and list models** trên trang cài đặt cũng thực hiện đúng phép kiểm tra này và điền danh sách mô hình khi thành công.

## Lỗi kết nối

Một yêu cầu bị lỗi trước khi server AI kịp phản hồi bất kỳ dữ liệu nào (hết thời gian chờ DNS, bị từ chối kết nối, bắt tay TLS không hoàn tất) sẽ được tự động gửi lại, tối đa 3 lần liên tiếp với khoảng nghỉ ngắn giữa các lần. Trong lúc đó khung chat hiển thị dòng trạng thái *thử lại (retrying)* và không mất dữ liệu vì server chưa bắt đầu trả lời. Khi lần thử cuối vẫn thất bại, lỗi sẽ hiển thị trong khung chat kèm nút **Retry** để gửi lại chính tin nhắn đó mà không cần gõ lại.

Lỗi xảy ra sau khi câu trả lời đã bắt đầu stream sẽ không tự động thử lại vì một phần câu trả lời đã hiện trên màn hình: hãy nhấn nút **Retry**.

## Quyền riêng tư

Server AI được gọi từ server Poznote, không bao giờ từ trình duyệt của bạn. Với instance Ollama hoặc LM Studio cục bộ, ghi chú và cuộc hội thoại của bạn không bao giờ rời khỏi máy. Với nhà cung cấp đám mây, các phần ghi chú mà trợ lý đọc để trả lời sẽ được gửi tới nhà cung cấp đó, bao gồm cả hình ảnh nếu bạn yêu cầu trợ lý xem ảnh. Khi bật các công cụ bên ngoài, dữ liệu trợ lý gửi tới chúng, ví dụ truy vấn tìm kiếm, sẽ đi tới các server bạn đã kết nối.
