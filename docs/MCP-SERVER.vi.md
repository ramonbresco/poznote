<!-- lang-selector -->
<p align="center">
  <a href="MCP-SERVER.md">English</a> ·
  <a href="MCP-SERVER.fr.md">Français</a> ·
  <a href="MCP-SERVER.de.md">Deutsch</a> ·
  <a href="MCP-SERVER.es.md">Español</a> ·
  <a href="MCP-SERVER.pt.md">Português</a> ·
  <a href="MCP-SERVER.ru.md">Русский</a> ·
  <a href="MCP-SERVER.zh-cn.md">简体中文</a> ·
  <a href="MCP-SERVER.ko.md">한국어</a> ·
  <a href="MCP-SERVER.ja.md">日本語</a> ·
  <a href="MCP-SERVER.ca.md">Català</a> ·
  <b>Tiếng Việt</b>
</p>
<!-- /lang-selector -->

# Poznote MCP Server

MCP (Model Context Protocol) server cho Poznote, hỗ trợ quản lý ghi chú bằng AI thông qua ngôn ngữ tự nhiên.

Server này **chỉ hỗ trợ giao thức truyền tải HTTP** (MCP Streamable HTTP).

> [!TIP]
> Bạn muốn trò chuyện với một mô hình cục bộ (ví dụ Ollama) trực tiếp bên trong Poznote? Bạn không cần MCP server cho việc đó: hãy dùng [AI Assistant](AI-ASSISTANT.vi.md) tích hợp sẵn (**Settings → Admin Tools → AI Assistant**). MCP server dùng để kết nối các trợ lý *bên ngoài* hỗ trợ MCP vào ghi chú của bạn; bản thân Ollama chỉ là một trình chạy mô hình chứ không phải MCP client, nên không thể kết nối trực tiếp tới MCP server.

<p align="center">
  <img src="mcp-poznote.gif" alt="Demo Poznote MCP Server" width="100%">
</p>

## Bắt đầu nhanh

Chọn trợ lý AI bạn muốn sử dụng:

- **[VS Code Copilot](VSCODE-COPILOT.vi.md):** Tích hợp Poznote vào trình soạn thảo của bạn
- **[Claude CLI](CLAUDE-CLI.vi.md):** Sử dụng Poznote từ dòng lệnh

---

## Cách hoạt động

MCP server đóng vai trò cầu nối giữa các trợ lý AI và instance Poznote của bạn.

### Các thành phần

- **`server.py`**: MCP server (HTTP / Streamable HTTP)
  - Mở endpoint MCP tại `http://127.0.0.1:8045/mcp`
  - Định nghĩa các công cụ (hành động) để quản lý ghi chú
  - Điều phối các lệnh gọi giữa AI và Poznote API

- **`client.py`**: HTTP client cho Poznote REST API
  - Thực hiện các yêu cầu HTTP (GET, POST, PATCH, DELETE)
  - Xử lý xác thực với Poznote API bằng service token dùng chung của MCP

### Luồng giao tiếp

1. Trợ lý AI (VS Code Copilot hoặc Claude CLI) kết nối tới MCP Server
2. MCP server gọi Poznote REST API
3. Kết quả được trả về cho trợ lý AI

Một tab Poznote đang mở trong trình duyệt sẽ nhận biết các thay đổi thực hiện qua MCP chỉ trong vài giây: cây thư mục ở thanh bên và ghi chú đang mở sẽ tự cập nhật tại chỗ (hoặc hiển thị biểu ngữ tải lại nếu ghi chú đang có chỉnh sửa chưa lưu). Việc ghi chú chỉ đang được mở trong trình duyệt không chặn các thao tác ghi từ MCP; chỉ khi ghi chú đang được chỉnh sửa bởi một người dùng khác trong cùng tài khoản, hoặc bởi khách truy cập qua liên kết chia sẻ công khai, server mới trả về lỗi HTTP 423.

## Tính năng

### Các công cụ (hành động)
- `get_note`: Lấy một ghi chú cụ thể theo ID hoặc theo đường dẫn, toàn bộ hoặc từng phần một (`offset`/`max_chars`, kèm `type` và `length` đầy đủ của ghi chú)
- `list_notes`: Liệt kê các ghi chú của một workspace theo từng trang (`limit`/`offset`, kèm `total` thực tế của workspace trong kết quả), có thể lọc theo thư mục, `tags` hoặc ngày cập nhật
- `search_notes`: Tìm kiếm ghi chú theo từ khóa truy vấn (khớp từng từ), kèm bộ lọc `tags`, `folder`, ngày tạo và ngày cập nhật
- `create_note`: Tạo ghi chú mới, tùy chọn khởi tạo từ một mẫu (template) và/hoặc đặt hạn hoàn thành/lời nhắc
- `update_note`: Cập nhật ghi chú hiện có, di chuyển ghi chú, và/hoặc đặt hạn hoàn thành/lời nhắc
- `append_to_note`: Thêm văn bản vào cuối ghi chú mà không cần đọc hay gửi lại phần nội dung còn lại
- `replace_in_note`: Thay đổi các đoạn trong ghi chú dựa theo văn bản khớp chính xác, giữ nguyên phần còn lại
- `replace_section`: Viết lại hoặc mở rộng đúng một phần mục được chỉ định bởi tiêu đề, giữ nguyên phần còn lại của ghi chú
- `get_note_outline`: Liệt kê các tiêu đề của ghi chú kèm vị trí bắt đầu và kết thúc (offset) của từng phần mục
- `delete_note`: Xóa một ghi chú theo ID
- `get_reminder`: Lấy lời nhắc hiện đang đặt trên một ghi chú
- `set_reminder`: Đặt hoặc thay thế lời nhắc của ghi chú, kèm chu kỳ lặp lại tùy chọn
- `remove_reminder`: Gỡ lời nhắc khỏi một ghi chú
- `list_reminders`: Liệt kê các lời nhắc đang chờ của một workspace: những lời nhắc đã đến hạn (luồng thông báo hình chuông trên giao diện), những lời nhắc sắp tới, hoặc cả hai (`scope`)
- `list_tasks`: Liệt kê các task của một ghi chú danh sách công việc (tasklist), kèm ID, hạn hoàn thành và các cờ trạng thái
- `list_all_tasks`: Liệt kê các task chưa hoàn thành trên toàn bộ ghi chú của một workspace, ưu tiên gấp nhất trước, kèm bộ lọc (khoảng hạn hoàn thành, ưu tiên cao, đã hoàn thành, chưa có ngày, danh sách kiểm tra trong ghi chú thông thường)
- `add_task`: Thêm một task vào ghi chú danh sách công việc, tùy chọn kèm hạn hoàn thành và lời nhắc
- `update_task`: Cập nhật một task (nội dung, hạn hoàn thành, lời nhắc, mức ưu tiên)
- `complete_task`: Đánh dấu một task là đã hoàn thành, hoặc mở lại task đó
- `delete_task`: Xóa một task khỏi ghi chú danh sách công việc
- `add_subtask`: Thêm một subtask bên dưới một task của ghi chú danh sách công việc
- `update_subtask`: Đổi tên một subtask, hoặc đánh dấu hoàn thành hay chưa hoàn thành
- `delete_subtask`: Xóa một subtask của một task
- `create_folder`: Tạo thư mục theo tên hoặc đường dẫn (`folder_path="Projects/2026/Q3"` tạo toàn bộ cây thư mục chỉ trong một lần gọi), hoặc tạo thư mục gốc nhật ký (diary) với `is_diary=true`
- `list_folders`: Liệt kê tất cả thư mục trong một workspace, kèm đường dẫn và cờ diary
- `list_workspaces`: Liệt kê tất cả các workspace hiện có
- `list_tags`: Liệt kê tất cả các tag duy nhất đang dùng trong ghi chú
- `list_templates`: Liệt kê các ghi chú mẫu mà tham số `from_template_id` của `create_note` có thể dùng để khởi tạo
- `get_trash`: Liệt kê tất cả ghi chú hiện đang ở trong thùng rác
- `empty_trash`: Xóa vĩnh viễn tất cả ghi chú trong thùng rác
- `delete_trash_note`: Xóa vĩnh viễn một ghi chú khỏi thùng rác, thay vì dọn sạch toàn bộ thùng rác
- `restore_note`: Khôi phục một ghi chú từ thùng rác
- `list_snapshots`: Liệt kê các phiên bản cũ đã lưu của một ghi chú, bao gồm cả snapshot an toàn được chụp trước mỗi lần AI hoặc MCP viết lại
- `get_snapshot`: Đọc nội dung của một phiên bản cũ của ghi chú mà không làm thay đổi ghi chú hiện tại
- `restore_snapshot`: Khôi phục ghi chú về một trong các snapshot của nó (bắt buộc truyền `snapshot_key` hoặc `date`)
- `duplicate_note`: Tạo bản sao của một ghi chú hiện có
- `toggle_favorite`: Bật/tắt trạng thái yêu thích của một ghi chú
- `list_attachments`: Liệt kê tất cả tệp đính kèm của một ghi chú cụ thể
- `get_attachment`: Đọc lại một tệp đính kèm: hình ảnh trả về dưới dạng ảnh để xem trực tiếp, các tệp khác trả về dưới dạng bytes (base64, hoặc văn bản đã giải mã), kèm loại tệp, kích thước và mã sha256
- `add_attachment`: Đính kèm một tệp vào ghi chú từ nội dung base64 (ảnh, log, PDF, …)
- `move_note`: Di chuyển một ghi chú sang workspace và/hoặc thư mục khác, vẫn giữ nguyên id
- `move_folder`: Di chuyển một thư mục (cùng các thư mục con và ghi chú bên trong) vào dưới một thư mục cha khác và/hoặc sang workspace khác
- `move_note_to_folder`: Di chuyển một ghi chú vào một thư mục cụ thể
- `remove_note_from_folder`: Đưa một ghi chú ra khỏi thư mục hiện tại (chuyển về thư mục gốc)
- `share_note`: Bật chia sẻ công khai cho một ghi chú và lấy URL công khai
- `unshare_note`: Tắt chia sẻ công khai cho một ghi chú
- `get_note_share_status`: Lấy trạng thái chia sẻ hiện tại và URL công khai của một ghi chú
- `get_folder_share_status`: Lấy trạng thái chia sẻ hiện tại và URL công khai của một thư mục
- `list_shared`: Liệt kê tất cả ghi chú và thư mục đang được chia sẻ công khai
- `list_shared_with_me`: Liệt kê các ghi chú và thư mục mà người dùng khác đã chia sẻ với hồ sơ này
- `get_backlinks`: Lấy tất cả các ghi chú có liên kết (tham chiếu) tới một ghi chú cụ thể
- `convert_note`: Chuyển đổi một ghi chú qua lại giữa định dạng HTML và Markdown
- `rename_folder`: Đổi tên một thư mục hiện có
- `delete_folder`: Xóa một thư mục và chuyển các ghi chú bên trong vào thùng rác
- `create_workspace`: Tạo một workspace mới
- `rename_workspace`: Đổi tên một workspace hiện có
- `delete_workspace`: Xóa một workspace (không thể xóa workspace cuối cùng)
- `get_git_sync_status`: Lấy trạng thái hiện tại của đồng bộ Git (GitHub/GitLab/Forgejo)
- `git_push`: Buộc đẩy (force push) các ghi chú cục bộ lên kho lưu trữ Git đã cấu hình
- `git_pull`: Buộc kéo (force pull) các ghi chú từ kho lưu trữ Git đã cấu hình
- `get_system_info`: Lấy thông tin phiên bản của bản cài đặt Poznote
- `list_backups`: Liệt kê tất cả các bản sao lưu hệ thống hiện có
- `create_backup`: Kích hoạt tạo một bản sao lưu hệ thống mới
- `restore_backup`: Khôi phục một tệp sao lưu (thay thế dữ liệu người dùng hiện tại)
- `delete_backup`: Xóa một tệp sao lưu cụ thể
- `get_app_setting`: Lấy giá trị của một thiết lập ứng dụng cụ thể
- `update_app_setting`: Cập nhật giá trị của một thiết lập ứng dụng cụ thể

**Xác định workspace cho một lệnh gọi.** Luôn chỉ rõ `workspace` khi gọi `create_note`, `create_folder` và `list_folders` (thư mục luôn thuộc về một workspace): đó là cách duy nhất để đảm bảo chính xác. Khi bỏ qua tham số này, server sẽ phân giải theo một thứ tự cố định chứ không bao giờ tự đoán: trước tiên là thiết lập `mcp_default_workspace` nếu nó trỏ tới một workspace tồn tại, sau đó là workspace duy nhất của tài khoản nếu tài khoản chỉ có một workspace. Khi có nhiều workspace và không có thiết lập mặc định, lệnh gọi sẽ bị từ chối và phản hồi sẽ liệt kê các workspace hiện có, thay vì thả ghi chú vào workspace nào tình cờ đứng đầu theo thứ tự sắp xếp (điều từng khiến đích đến tự thay đổi, chẳng hạn lần đầu lưu trữ ghi chú tạo ra "Archives"). Đặt mặc định bằng `update_app_setting("mcp_default_workspace", "<name>")`.

**Tệp đính kèm.** `add_attachment(note_id, filename, content_base64)` lưu tệp vào một ghi chú giống hệt thao tác kéo-thả trên giao diện web, nhờ vậy có thể đính kèm biểu đồ mới tạo hoặc tệp log mà không cần người thao tác thủ công; nội dung dạng `data:` URI cũng được chấp nhận. Các quy tắc của chính Poznote vẫn được áp dụng, nên loại tệp thực thi hoặc tình trạng đầy hạn mức dung lượng sẽ trả về thông báo từ chối kèm lý do. Dữ liệu byte đi qua chuỗi mã hóa base64 bên trong lời gọi công cụ, nên công cụ giới hạn dung lượng tải lên ở mức 25 MB và hướng dẫn dùng giao diện web cho các tệp lớn hơn. `get_attachment(note_id, filename=…)` dùng để đọc lại một tệp đính kèm, điều mà `add_attachment` trước đây chưa có hàm đối ứng. Các ảnh PNG, JPEG, GIF hoặc WebP được trả về dưới dạng một **khối hình ảnh (image block)** mà mô hình thực sự nhìn thấy được, nhờ đó bạn có thể hỏi bức ảnh, ảnh chụp màn hình hay bản scan trong ghi chú đang thể hiện gì; mọi định dạng khác được trả về ở dạng mã hóa base64, hoặc giải mã thành UTF-8 với `encoding="text"` cho tệp văn bản, log hay CSV, và bị từ chối với các định dạng khác để tệp PDF không bao giờ bị trả về thành ký tự lỗi mã hóa (mojibake). `encoding="base64"` yêu cầu trả về byte của ảnh ở dạng chuỗi văn bản dành cho client tự giải mã, còn `encoding="image"` yêu cầu rõ ràng trả về khối hình ảnh và sẽ bị từ chối nếu tệp không phải là ảnh. Định dạng được đọc trực tiếp từ dữ liệu byte chứ không dựa vào tên tệp, nên một tệp bị đổi đuôi thành `.png` sẽ không bao giờ bị nhận nhầm là ảnh; ảnh SVG cũng không thuộc loại có thể hiển thị trực tiếp theo cách này. Mọi nội dung chữ viết bên trong hình ảnh luôn được xem là dữ liệu, không bao giờ là chỉ thị thực thi. Kết quả trả về kèm theo loại tệp và kích thước mà Poznote ghi nhận cùng mã `sha256` của dữ liệu byte, giúp client kiểm tra tệp có được lưu trọn vẹn không hoặc nhận ra cùng một tệp trên ghi chú khác mà không cần đọc lại lần nữa. Hãy chỉ định tệp đính kèm bằng `filename` hoặc `attachment_id` do `list_attachments` trả về; nếu hai tệp đính kèm trong cùng ghi chú có tên giống nhau, lệnh gọi sẽ bị từ chối và liệt kê cả hai thay vì tự chọn một. Giới hạn 25 MB cũng áp dụng cho thao tác đọc; mọi tệp lớn hơn cần tải từ giao diện web hoặc trực tiếp từ `GET /api/v1/notes/{id}/attachments/{attachment_id}`.

**Di chuyển dữ liệu.** `move_note` và `move_folder` thực hiện di chuyển chứ không sao chép: id, nội dung, lịch sử và các liên kết trỏ tới ghi chú đều được giữ nguyên. Trên `update_note`, tham số `workspace` dùng để chỉ nơi *tìm kiếm ghi chú*; tham số dùng để di chuyển nó sang nơi khác là `target_workspace`. Một ghi chú đổi workspace mà không được chỉ định thư mục ở đích đến sẽ được đặt ở thư mục gốc của workspace mới, vì thư mục cũ thuộc về workspace mà nó vừa rời đi. Khi di chuyển một thư mục, toàn bộ thư mục con và mọi ghi chú bên trong cũng đi theo.

**Tìm kiếm ghi chú.** `search_notes` tìm sao cho mọi từ trong truy vấn đều xuất hiện ở đâu đó trong ghi chú, theo bất kỳ thứ tự và khoảng cách nào, nhờ vậy tìm hai từ không còn bắt buộc chúng phải đứng cạnh nhau. `"Dấu ngoặc kép"` giữ nguyên cụm từ đi liền nhau, và `mode="any"` hoặc `mode="phrase"` thay đổi cách hiểu này. Cả `search_notes` và `list_notes` đều lọc được theo `tags` (mọi tag đều phải có mặt, và khớp nguyên tag, nên `topic/ai` không khớp với `topic/ai-safety`) và theo `updated_from`/`updated_to`, giúp client đang giữ bản sao chỉ cần hỏi những gì thay đổi từ một ngày nhất định thay vì liệt kê toàn bộ. `search_notes` còn nhận tham số `folder` là tên hoặc đường dẫn.

**Định vị ghi chú theo đường dẫn.** Mọi công cụ nhận id ghi chú đều nhận thêm `path`, nhưng chỉ truyền đúng một trong hai: `get_note(path="Projects/Alpha/Status")` đọc thẳng ghi chú đó mà không cần tra id trước, tiết kiệm bước gọi vốn phải làm mỗi lần đọc ở các client dựng đường dẫn. Phần thư mục được khớp giống mọi tham số thư mục khác, theo đường dẫn phân tách bằng dấu gạch chéo tính từ gốc workspace hoặc theo tên đơn ở mọi độ sâu, với `Default` đại diện cho chính thư mục gốc, và tiêu đề ghi chú phải khớp toàn bộ không phân biệt hoa thường hay dấu. Tiêu đề là duy nhất bên trong một thư mục, nên một đường dẫn đầy đủ trong một workspace xác định chỉ trỏ tới tối đa một ghi chú; còn một tiêu đề đơn, một tên thư mục đơn hoặc một đường dẫn trùng tên ở hai workspace có thể khớp với nhiều ghi chú, khi đó lệnh gọi sẽ bị từ chối kèm danh sách ứng viên và id của chúng thay vì tự chọn một. Việc chỉ định `workspace` là tùy chọn: một đường dẫn không kèm workspace sẽ được tìm trong mọi workspace của hồ sơ. Ghi chú nằm trong thùng rác không còn đường dẫn nào nữa, vì vậy `restore_note` và `delete_trash_note` vẫn chỉ nhận id do `get_trash` trả về, và một ghi chú hoặc thư mục có tên riêng chứa dấu gạch chéo hoàn toàn không thể định vị bằng đường dẫn: `Projects/2026/11/06` được hiểu là thư mục `Projects/2026/11`, nên một ghi chú tên `2026/11/06` phải truy cập bằng id.

**Thư mục.** Mọi công cụ nhận tham số thư mục đều xử lý thống nhất: một tên đơn, hoặc một đường dẫn phân tách bằng dấu gạch chéo. `create_note(folder="Diary/2026/08")` tạo luôn các cấp thư mục còn thiếu trên đường dẫn; `create_folder(folder_path=…)` làm điều tương tự cho thư mục; `list_notes(folder_id=…)` giới hạn danh sách trong một thư mục ngay ở phía server, nên giá trị `total` chỉ đếm riêng thư mục đó. Một tên đơn có thể tìm tới thư mục đã tồn tại ở bất kỳ độ sâu nào nếu trong workspace chỉ có đúng một thư mục mang tên đó, thay vì tạo thêm thư mục trùng tên ở gốc; nếu có nhiều thư mục trùng tên, lệnh gọi sẽ bị từ chối và liệt kê các đường dẫn đó, khi ấy hãy truyền đường dẫn đầy đủ hoặc id.

**Nhật ký (Diaries).** Nhật ký không chỉ là một thư mục đặt tên là Diary: đó là một thư mục gốc mang cờ `is_diary`, và nút "New diary entry" trên giao diện sẽ phân loại các ghi chú theo ngày vào thư mục gốc được gắn cờ này. Tạo một nhật ký bằng `create_folder(folder_name="Journal", is_diary=true)`, và dùng `list_folders` để biết thư mục nào là nhật ký. Nếu truyền tên của một thư mục gốc đã có sẵn, thư mục đó sẽ được chuyển thành nhật ký và giữ nguyên các ghi chú bên trong. Bản thân các mục nhật ký là những ghi chú thông thường: hãy lưu chúng bằng `create_note(folder="Journal/2026/09")`.

**Mẫu ghi chú (Templates).** Một mẫu ghi chú là ghi chú thông thường đặt trong thư mục tên `Templates` (ở bất kỳ cấp con nào bên dưới cũng tính) hoặc ở bất kỳ đâu trong một workspace mang tên đó; từ này được nhận diện trên mọi ngôn ngữ giao diện có sẵn, nên thư mục tên `Modèles` cũng hợp lệ. `list_templates` trả về các mẫu kèm id, và `create_note(from_template_id=…)` khởi tạo ghi chú mới từ mẫu theo đúng định dạng của mẫu đó; nếu truyền `note_type="markdown"` thì một mẫu HTML sẽ được chuyển đổi sang Markdown giống cách lệnh `/template` chuyển đổi trong trình soạn thảo. Không thể khởi tạo danh sách công việc (task list) hoặc bản vẽ từ mẫu. Nếu truyền thêm `content`, nội dung đó sẽ được nối vào sau phần thân của mẫu.

**Lời nhắc và công việc (Reminders & tasks).** `reminder_at` (trên `create_note`/`update_note` và `set_reminder`) là một chuỗi thời gian chuẩn ISO chẳng hạn `2026-09-01T09:00:00+02:00`; nhớ kèm phần múi giờ (offset), nếu không thời gian sẽ được hiểu là UTC. Hạn hoàn thành của task (`due_at`) thì khác: đây là thời gian theo đồng hồ cục bộ dạng `YYYY-MM-DD` hoặc `YYYY-MM-DDTHH:MM` không có offset, được phân giải theo múi giờ người dùng đã cấu hình, và nếu chỉ ghi ngày mà không có giờ thì lời nhắc sẽ đặt vào 09:00. Chu kỳ lặp lại dùng định dạng `<count><unit>` với đơn vị `i`/`h`/`d`/`w`/`m`/`y`, ví dụ `30i`, `1d` hoặc `2w`.

Các công cụ quản lý task thao tác trên từng task một: gọi `list_tasks` để lấy ID của từng task, rồi dùng `add_task`, `update_task`, `complete_task` hoặc `delete_task`. Mỗi lệnh gọi chỉ mang theo dữ liệu của đúng task đó, nên client không bao giờ phải đọc cả danh sách task rồi gửi lại toàn bộ mảng, và hai bên gọi cùng lúc để sửa hai task khác nhau sẽ không ghi đè lẫn nhau. Poznote lưu các task của một ghi chú dưới dạng một mảng JSON duy nhất và server ghi lại mảng này sau mỗi lần gọi, nên khối lượng xử lý của mỗi lần gọi vẫn tăng theo độ dài của danh sách. Thông báo luôn được đồng bộ tự động, và khi hoàn thành hoặc xóa một task thì lời nhắc đang chờ của nó cũng được gỡ bỏ. Một task có thể chứa các subtask sâu một cấp: `list_tasks` trả về chúng trong mảng `subtasks` của task kèm ID riêng, còn `add_subtask`, `update_subtask` và `delete_subtask` thay đổi từng subtask một. Mỗi subtask chỉ có văn bản và cờ hoàn thành, và việc đánh dấu hoàn thành subtask không làm task cha tự động hoàn thành.

**Ghi chú dài.** Một ghi chú có thể dài vượt quá kích thước phù hợp cho một lần ghi nguyên vẹn: đổi một dòng trong ghi chú 1 MB bằng `update_note` sẽ phải truyền toàn bộ văn bản theo cả hai chiều. `append_to_note` thêm văn bản vào cuối và `replace_in_note` sửa một đoạn theo văn bản khớp chính xác mà không buộc bên gọi phải nắm toàn bộ phần còn lại của ghi chú, nhờ đó chi phí mỗi lần ghi không tăng theo chiều dài ghi chú. Dấu phân tách được tự động xử lý: một dòng trống với ghi chú Markdown, một đoạn văn với ghi chú HTML. Giá trị `find` không tồn tại, hoặc khớp nhiều chỗ mà không bật `"all": true`, sẽ bị từ chối thay vì tự đoán. Khi đọc, `get_note(max_chars=…)` trả về từng phần một và `next_offset` cho biết phần tiếp theo bắt đầu từ đâu; offset đếm theo ký tự và chỉ có hiệu lực trên đúng phiên bản ghi chú vừa đọc. Cả hai công cụ ghi đều tự giải quyết xung đột phiên bản bằng cách áp dụng lại thay đổi lên nội dung mới mà thông báo xung đột trả về. Có hai phản hồi đòi hỏi cách xử lý khác nhau: `note_locked` (HTTP 423) nghĩa là có người khác đang sửa ghi chú và chưa có gì bị thay đổi, nên có thể thử lại sau một cách an toàn; trong khi `write_outcome_unknown` nghĩa là yêu cầu đã hết thời gian chờ sau khi được gửi đi, nên hãy đọc lại ghi chú trước khi thử lại nếu không cùng một đoạn văn bản có thể bị ghi hai lần. Cả hai công cụ đều từ chối ghi chú danh sách công việc vì nội dung của loại ghi chú này là một mảng JSON các task: hãy dùng `add_task` và các công cụ task đi kèm. `get_note_outline` liệt kê các tiêu đề của ghi chú kèm vị trí offset của từng phần mục để bên gọi có thể đọc hoặc viết lại riêng một phần mà không đụng tới phần còn lại, còn `replace_section` viết lại hoặc mở rộng phần mục được tiêu đề chỉ định trong khi giữ nguyên dòng tiêu đề đó. Một phần mục kéo dài tới tiêu đề tiếp theo có cùng cấp hoặc cấp cao hơn, nên `mode="replace"` sẽ thay thế luôn cả các mục con bên trong nó, và trong ghi chú HTML thì cả những khối hộp (box) nằm dưới nó; `mode="append"` chỉ nối thêm vào cuối phần mục, ngay trước tiêu đề kế tiếp. Việc khớp tiêu đề bỏ qua hoa thường và khoảng trắng thừa; nếu có nhiều tiêu đề trùng chữ thì lệnh gọi sẽ liệt kê chúng chứ không tự chọn (dùng `occurrence` để chọn một vị trí cụ thể), và `create_if_missing` sẽ mở thêm phần mục đó ở cuối ghi chú. Trong ghi chú HTML, chỉ những tiêu đề nằm ở cấp ngoài cùng của cấu trúc markup mới có thể trỏ tới theo cách này: tiêu đề lồng bên trong một phần tử khác sẽ được liệt kê với `addressable: false` và bị từ chối khi gọi sửa, vì phần mục đó không có ranh giới sạch để cắt mà không làm hỏng cấu trúc HTML bao quanh.

**Lịch sử phiên bản và hoàn tác.** Poznote chụp một snapshot an toàn của ghi chú ngay trước khi trợ lý AI hoặc MCP server viết lại nội dung, nhờ đó một lệnh `update_note` không như ý có thể hoàn tác được. `list_snapshots` hiển thị các snapshot đang lưu của ghi chú, mỗi bản có trường `origin` nhận diện các bản sao lưu an toàn này (`ai` hoặc `mcp`); `get_snapshot` đọc một snapshot mà không làm thay đổi ghi chú, và `restore_snapshot` khôi phục nội dung của nó trở lại ghi chú. `restore_snapshot` ghi đè nội dung hiện tại, nên nó bắt buộc phải truyền `snapshot_key` hoặc `date` chứ không tự lùi về snapshot trong ngày. Nó không lưu nội dung hiện tại trước khi ghi đè: những gì bị thay thế sẽ mất trừ khi đã có một snapshot lưu giữ sẵn. Giao diện Poznote gọi các snapshot là các bản sửa đổi (revisions): người dùng duyệt và so sánh chúng trên trang **Revisions** của ghi chú, vì vậy mọi yêu cầu về revisions hay lịch sử phiên bản đều tương ứng với nhóm công cụ này.

**Xem tổng hợp xuyên suốt nhiều ghi chú.** `list_all_tasks` trả lời câu hỏi "còn việc gì cần làm" trên toàn bộ một workspace, trong khi `list_tasks` chỉ bao phủ một ghi chú đơn lẻ. Công cụ này trả về hai loại mục phân biệt qua trường `source`: các task của ghi chú danh sách công việc có id dùng được với `update_task` và `delete_task`, và các mục hộp kiểm (checkbox) viết bên trong ghi chú thông thường có id chỉ là vị trí trong ghi chú nên không thể thao tác trực tiếp bằng các công cụ task. Có thể giới hạn hạn hoàn thành từ cả hai phía, ví dụ `due_after="2026-11-09"` cùng `due_before="2026-11-15"` tương ứng với "những việc đến hạn tuần tới", và `include_undated=false` loại bỏ các task không có ngày. `list_reminders` liệt kê các lời nhắc đang chờ của một workspace theo nhóm mà `scope` chỉ định: `fired` (mặc định) gồm các lời nhắc đã quá giờ kích hoạt và chưa được bỏ qua đúng như hiển thị ở biểu tượng chuông, mới nhất trước; `upcoming` gồm các lời nhắc sắp tới, gần nhất trước; `all` gồm cả hai, nhóm đã kích hoạt xếp trước. Nhờ đó việc rà soát tuần tới chỉ tốn một lần gọi, thay vì phải gọi `get_reminder` cho từng ghi chú. Chỉ các lời nhắc mới được liệt kê, không bao gồm hạn hoàn thành không có lời nhắc: với nhóm đó, hãy dùng `list_all_tasks` cùng cửa sổ ngày tương ứng. Mỗi dòng kết quả cho biết nó thuộc nhóm nào (`state`), mang theo `note_id`, `note_title`, `reminder_at` (UTC) và `recurrence`, và có thêm `task_id` nếu đó là lời nhắc của một task cụ thể thay vì của cả ghi chú.

Hầu hết các công cụ chấp nhận tham số tùy chọn `user_id` để nhắm tới một hồ sơ người dùng cụ thể. Khi được cung cấp, MCP server gửi header `X-User-ID` cho yêu cầu đó, cho phép bạn tạo hoặc đọc ghi chú qua lại giữa các hồ sơ khác nhau mà không cần đổi cấu hình môi trường toàn cục của MCP. Ngoại lệ là các công cụ cấp hệ thống `get_system_info`, `list_backups`, `create_backup` và `delete_backup`, vốn không nhận `user_id`. Để đổi hồ sơ mặc định dùng khi không truyền `user_id`, hãy xem [Hồ sơ người dùng mặc định](#hồ-sơ-người-dùng-mặc-định).

---

## Cài đặt Server

MCP server đã được tích hợp sẵn trong tệp `docker-compose.yml` chính thức của Poznote và tự động chạy cùng hệ thống.

### Cấu hình

MCP server sử dụng các giá trị mặc định từ `docker-compose.yml`:

```bash
# Cổng mặc định của MCP Server là 8045
# Ghi log debug mặc định là false
```

Poznote tự động tạo service token của MCP trong tệp `data/.mcp_token`. Container `mcp-server` đọc tệp này thông qua volume dùng chung `./data:/var/www/html/data:ro`, nên không cần lưu mật khẩu nào trong `.env`. Trong khi tệp còn chưa tồn tại, server sẽ thử đọc lại ở mỗi lần gọi, nhờ đó một MCP server khởi động trước khi Poznote kịp tạo tệp vẫn tự nhận được token mà không cần khởi động lại. Nếu MCP server chạy bên ngoài Compose stack này thì sẽ không thấy đường dẫn đó: hãy đặt `POZNOTE_SERVICE_TOKEN_FILE` trỏ tới vị trí thực tế của `data/.mcp_token` trên máy chủ đó.

Để ghi đè cổng và chế độ debug trong một lần khởi chạy, hãy tạo lại container MCP với các biến môi trường đặt trực tiếp trên dòng lệnh:

```bash
POZNOTE_MCP_PORT=9000 POZNOTE_DEBUG=true docker compose up -d --force-recreate mcp-server
```

Lệnh `docker compose restart mcp-server` đơn thuần không nạp lại các biến môi trường đã thay đổi.

#### Chọn chế độ phù hợp với nhu cầu

MCP server nhận diện các client của mình theo một trong ba cách. Câu hỏi giúp phân biệt chúng là **ai quyết định yêu cầu sẽ tác động lên tài khoản Poznote nào**:

| Tình huống của bạn | Chế độ | Ai quyết định tài khoản |
|---|---|---|
| Chỉ mình bạn dùng, với client trên cùng máy (VS Code, Claude CLI) | Classic, chế độ mặc định, tùy chọn kèm [token đầu vào](#token-xác-thực-đầu-vào) | Cấu hình của server: `POZNOTE_USER_ID` (mặc định là hồ sơ `1`), hoặc bất kỳ hồ sơ nào mà yêu cầu chỉ định bằng `user_id` |
| Nhiều người dùng, các ứng dụng chat (ChatGPT, Claude, Gemini), hoặc VS Code / Claude Code kết nối tới server công khai | [Đăng nhập từ các ứng dụng chat](#đăng-nhập-từ-các-ứng-dụng-chat-chatgpt-claude-gemini) (`POZNOTE_MCP_AUTH_PROVIDER=poznote`) | Chính người đăng nhập: luôn là tài khoản của riêng họ |
| Các agent đã nắm giữ sẵn token từ nhà cung cấp danh tính của bạn (Keycloak, Authentik, ...) | [Xác thực theo từng người gọi](#xác-thực-theo-từng-người-gọi-tùy-chọn) (`userinfo` hoặc `introspection`) | Hồ sơ được liên kết với danh tính của token đó |

Ngay khi có nhiều người dùng chung một MCP server, hãy dùng chế độ thứ hai: ở chế độ classic, mọi client đều có thể truy cập tới mọi tài khoản.

#### Hồ sơ người dùng mặc định

Mặc định MCP server hoạt động với tư cách hồ sơ người dùng `1` (quản trị viên đầu tiên). Để ghim server vào một hồ sơ khác, hãy đặt `POZNOTE_USER_ID` khi khởi động container:

```bash
POZNOTE_USER_ID=2 docker compose up -d --force-recreate mcp-server
```

Khi đó mọi lệnh gọi công cụ sẽ áp dụng cho hồ sơ đó trừ khi một yêu cầu truyền rõ tham số `user_id`, vốn vẫn được ưu tiên cho riêng yêu cầu ấy. Giá trị phải là một ID hồ sơ dạng số; mọi giá trị khác sẽ bị bỏ qua kèm một cảnh báo trong log MCP và hệ thống sẽ quay về dùng mặc định `1`.

#### Token xác thực đầu vào

Mặc định endpoint MCP chấp nhận mọi client có thể kết nối tới nó, điều này an toàn vì cổng chỉ được mở trên `127.0.0.1`. Nếu bạn mở cổng ra ngoài máy cục bộ (qua reverse proxy, mạng LAN, hoặc cài đặt trực tiếp không qua container), hãy đặt `POZNOTE_MCP_AUTH_TOKEN` và server sẽ yêu cầu header `Authorization: Bearer <token>` trên mọi yêu cầu, trả về `401 Unauthorized` nếu thiếu hoặc sai:

```bash
# Tạo một token mạnh một lần
openssl rand -hex 32

# Đặt vào tệp .env
POZNOTE_MCP_AUTH_TOKEN=paste-the-token-here

# Tạo lại container MCP để nạp cấu hình môi trường mới
docker compose up -d --force-recreate mcp-server
```

Sau đó thêm chính header đó vào cấu hình client của bạn: xem [VS Code Copilot](VSCODE-COPILOT.vi.md#sử-dụng-token-xác-thực) và [Claude CLI](CLAUDE-CLI.vi.md#sử-dụng-token-xác-thực). Khoảng trắng ở đầu và cuối token được bỏ qua, nên một token đọc từ tệp secrets có ký tự xuống dòng ở cuối vẫn hoạt động. Giá trị rỗng sẽ giữ nguyên trạng thái mở không yêu cầu xác thực. Dòng log lúc khởi động cho biết chế độ nào đang được kích hoạt.

Token này tách biệt hoàn toàn với `data/.mcp_token`: tệp kia là thứ MCP server dùng để gọi *tới* Poznote API, còn token này là thứ *trợ lý AI của bạn* phải xuất trình cho MCP server.

#### Đăng nhập từ các ứng dụng chat (ChatGPT, Claude, Gemini)

Các ứng dụng chat kết nối tới một MCP server từ xa, chẳng hạn ChatGPT (và ứng dụng Codex), Claude Desktop và claude.ai, hoặc Gemini, không nhận token dán thủ công: chúng kỳ vọng server dẫn qua luồng đăng nhập OAuth. Với `POZNOTE_MCP_AUTH_PROVIDER=poznote`, chính Poznote sẽ đảm nhận vai trò đó:

1. Bạn thêm `https://mcp.example.com/mcp` làm trình kết nối (connector) trong ứng dụng, để trống các trường client ID và secret: ứng dụng sẽ tự đăng ký. Các ứng dụng đặt phần này trong phần cài đặt, thường dưới tên custom connectors hoặc remote MCP servers, và một số ứng dụng chỉ cung cấp trên một số gói nhất định hoặc ở chế độ dành cho nhà phát triển.
2. Ứng dụng mở trang đăng nhập của Poznote. Bạn đăng nhập theo cách vẫn dùng hằng ngày (mật khẩu, xác thực hai yếu tố hoặc SSO).
3. Trang xác nhận quyền hiển thị tên ứng dụng, nơi nó sẽ chuyển hướng bạn quay về và tài khoản nó sẽ sử dụng, luôn là tài khoản của chính bạn (không bao giờ là tài khoản bạn chỉ được chia sẻ quyền truy cập), đồng thời cho phép bạn chọn mức quyền: **Read only** (chỉ đọc), **Read and edit** (đọc và sửa) hoặc **Full access** (toàn quyền), tương ứng với ba mức [phạm vi công cụ](#phạm-vi-công-cụ-tool-scope).
4. Bạn nhấn **Allow**, và từ đó ứng dụng chỉ truy cập được duy nhất tài khoản đó ở đúng mức quyền đã cấp.

Nhờ vậy một MCP server phục vụ cho toàn bộ instance, mỗi người chỉ chạm được tới ghi chú của riêng mình (và các workspace được chia sẻ với họ). Trang **Settings > My Account > Connected apps** liệt kê các kết nối hiện có, cho phép ngắt bất kỳ kết nối nào, và hiển thị sẵn địa chỉ connector để mọi người sao chép.

Yêu cầu:

- Ứng dụng chat kết nối từ Internet (ChatGPT và claude.ai kết nối từ server riêng của họ), nên cả MCP server và Poznote đều phải truy cập được từ ngoài qua **HTTPS**. Hãy đặt MCP server phía sau reverse proxy trên **một tên miền (hoặc tên miền phụ) riêng**, ví dụ `https://mcp.example.com`: các tài liệu khám phá OAuth được phục vụ ngay tại gốc của địa chỉ đó. Đích mà proxy chuyển tiếp lưu lượng tới phụ thuộc vào nơi proxy đang chạy:
  - cài trực tiếp trên máy chủ: proxy tới `127.0.0.1:8045` (cổng mà `docker-compose.yml` công bố, tức `POZNOTE_MCP_PORT`);
  - chạy trong Docker (Nginx Proxy Manager, Traefik, Caddy, ...): `127.0.0.1` lúc đó chính là container của bản thân proxy. Hãy nối proxy vào mạng Docker của Poznote bằng lệnh `docker network connect poznote_default <proxy-container>` (tên mạng đặt theo tên thư mục chứa `docker-compose.yml` của bạn, xem bằng `docker network ls`), rồi proxy tới `mcp-server:8045`.
- Bản thân các trang `/oauth/` của Poznote phải truy cập được mà không bị chặn bởi một lớp đăng nhập khác phía trước (xác thực chuyển tiếp như Authelia hoặc Authentik trên proxy của bạn): các ứng dụng chat gọi trực tiếp một số trang trong đó từ server của chúng và không có trình duyệt để hiển thị màn hình đăng nhập.
- Đặt hai biến trong `.env`, rồi tạo lại container (`docker compose up -d --force-recreate mcp-server`). Tệp `docker-compose.yml` phiên bản cũ không truyền các biến này vào container: hãy tải bản mới nhất trước. Log của MCP sau đó sẽ hiện dòng `OAuth sign-in through Poznote enabled` khi khởi động.

```bash
POZNOTE_MCP_AUTH_PROVIDER=poznote
# URL công khai của MCP server, không kèm /mcp
POZNOTE_MCP_PUBLIC_URL=https://mcp.example.com
```

- URL công khai của Poznote, nơi mọi người đăng nhập, là trường **Instance URL** trong **Settings > Admin Tools > Admin Webhooks**, cũng là địa chỉ được email nhắc nhở và webhook sử dụng (`POZNOTE_APP_URL` trong `.env` khi trường này còn trống). Khi cả hai đều chưa đặt, hệ thống sẽ tự điền dựa trên trình duyệt của một quản trị viên; hãy kiểm tra để chắc chắn đó đúng là địa chỉ người dùng truy cập Poznote từ Internet. Mọi thay đổi sẽ tới MCP server trong vòng một phút mà không cần khởi động lại. Cửa sổ **Connected apps** hiển thị cho quản trị viên thấy địa chỉ đang được sử dụng, kèm cảnh báo nếu đó là địa chỉ cục bộ hoặc HTTP thuần.

Nếu thiết lập chưa hoạt động:

- **Ứng dụng báo không tìm thấy thiết lập ủy quyền (OAuth) của server.** Từ một máy bên ngoài mạng của bạn, mở `https://mcp.example.com/.well-known/oauth-protected-resource/mcp` và `https://mcp.example.com/.well-known/oauth-authorization-server`: cả hai đều phải trả về JSON. Lỗi `503` ở đường dẫn thứ hai nghĩa là chưa đặt URL công khai của Poznote; không có phản hồi nào nghĩa là reverse proxy chưa tới được MCP server.
- **Ứng dụng mở trang đăng nhập nhưng trang không tải được.** Địa chỉ Instance URL không phải là địa chỉ mà ứng dụng có thể truy cập: xem cảnh báo trong **Connected apps** và sửa lại trong **Admin Webhooks > Instance URL**.
- **Log của MCP không hiện `OAuth sign-in through Poznote enabled` khi khởi động.** Các biến môi trường chưa đi vào container: kiểm tra `.env` và `docker-compose.yml`, sau đó tạo lại container (chỉ `restart` là chưa đủ).
- **Đăng nhập thành công nhưng mọi yêu cầu sau đó đều thất bại.** URL connector phải khớp chính xác `POZNOTE_MCP_PUBLIC_URL` nối thêm `/mcp`; nếu sai, log của MCP sẽ báo `Rejecting a token issued for ...`.
- Lệnh `docker compose logs mcp-server` cho biết server đã từ chối gì và vì sao; đặt `POZNOTE_DEBUG=true` để ghi lại chi tiết từng yêu cầu.

Các quy tắc áp dụng cho mọi kết nối:

- Kết nối duy trì chừng nào còn được sử dụng: ứng dụng tự làm mới quyền truy cập mỗi giờ, và phải đăng nhập lại sau 90 ngày không dùng. Một ứng dụng đã bị ngắt kết nối vẫn có thể tiếp tục hoạt động tối đa `POZNOTE_MCP_AUTH_CACHE_TTL` giây (mặc định là 60).
- `POZNOTE_MCP_SCOPE` vẫn đặt trần quyền cho mọi kết nối: cấp **Full access** cho một server đang giới hạn ở `write` thì kết nối cũng chỉ nhận được quyền `write`.
- Các công cụ tác động lên toàn bộ instance (sao lưu, cài đặt toàn cục, thông tin hệ thống) đòi hỏi tài khoản quản trị viên, và một yêu cầu không thể chỉ định tài khoản khác thông qua `user_id`.
- Một ứng dụng đã kết nối không thể thay đổi nơi dữ liệu của tài khoản được gửi đi: kho lưu trữ Git sync, server và token, cũng như các endpoint và khóa của trợ lý AI và tính năng đọc chính tả. Tuy vậy nó vẫn có thể push lên và pull về từ kho lưu trữ bạn đã cấu hình.
- `POZNOTE_MCP_AUTH_TOKEN` bị bỏ qua khi chế độ này đang bật.

#### Xác thực theo từng người gọi (tùy chọn)

`POZNOTE_MCP_AUTH_TOKEN` ở trên là một bí mật dùng chung: mọi client đều xuất trình
cùng một token, và server hoạt động dưới một hồ sơ duy nhất. Khi nhiều người
hoặc agent dùng chung một MCP instance, cách đó không phân biệt được từng bên gọi.

Thiết lập `POZNOTE_MCP_AUTH_PROVIDER` sẽ chuyển sang cơ chế xác thực theo từng người gọi: mỗi
client xuất trình **token của riêng nó**, token đó được kiểm tra với một nhà cung cấp
danh tính bên ngoài và ánh xạ tới hồ sơ Poznote của chính người gọi. Một instance,
nhiều bên gọi, mỗi bên đều được định danh chính xác.

Các biến này đặt trong `.env` như các biến khác. Chúng được đưa vào MCP container
thông qua khối `environment:` của service `mcp-server`, và một tệp
`docker-compose.yml` cũ hơn không liệt kê chúng nên chúng sẽ bị bỏ qua âm thầm. Nếu
bạn dùng các biến này, hãy tải bản `docker-compose.yml` mới nhất trước (xem
[Cập nhật ứng dụng](README.vi.md#cập-nhật-ứng-dụng)) và kiểm tra log của MCP có hiện
`Per-caller authentication enabled` lúc khởi động hay không.

| biến | mặc định | ý nghĩa |
|---|---|---|
| `POZNOTE_MCP_AUTH_PROVIDER` | *(chưa đặt, tắt tính năng)* | `userinfo` hoặc `introspection` (`poznote` được mô tả ở [mục trên](#đăng-nhập-từ-các-ứng-dụng-chat-chatgpt-claude-gemini)) |
| `POZNOTE_MCP_AUTH_URL` | *(bắt buộc)* | endpoint của nhà cung cấp |
| `POZNOTE_MCP_IDENTITY_MATCH` | `oidc_subject:sub` | danh sách các cặp `<profile-field>:<claim>` theo thứ tự ưu tiên |
| `POZNOTE_MCP_AUTH_AUDIENCE` | *(chưa đặt, tắt tính năng)* | giá trị `aud` kỳ vọng, phân tách bằng dấu phẩy; từ chối token cấp cho ứng dụng khác |
| `POZNOTE_MCP_AUTH_HEADER` | `Authorization` | tên header mà server này gửi **tới nhà cung cấp** |
| `POZNOTE_MCP_AUTH_CLIENT_ID` / `_CLIENT_SECRET` | *(chưa đặt, tắt tính năng)* | chỉ dùng cho `introspection`, gửi dưới dạng HTTP Basic |
| `POZNOTE_MCP_AUTH_TIMEOUT` | `5` | tính bằng giây |
| `POZNOTE_MCP_AUTH_CACHE_TTL` | `60` | số giây lưu cache kết quả phân giải token/hồ sơ |

`userinfo` thực hiện `GET <url>` kèm bearer token của bên gọi, tức OpenID
Connect UserInfo endpoint. Token không bao giờ được xác minh cục bộ, nên opaque token
hoạt động tốt y như JWT, và bạn không phải bảo trì JWKS hay cơ chế xoay vòng khóa.
`introspection` thực hiện `POST <url>` với `token=<token>` (RFC 7662); phản hồi có
`active: false` bị coi là token không hợp lệ.

Claim đầu tiên trong `POZNOTE_MCP_IDENTITY_MATCH` có mặt **và khớp với đúng một hồ sơ**
sẽ được chọn. Các trường của hồ sơ là những trường được `GET /api/v1/admin/users`
trả về. Mặc định hệ thống chỉ đối chiếu theo subject. Việc đối chiếu theo
`preferred_username` hoặc `email` có hỗ trợ nhưng yếu hơn, vì luồng đăng nhập của
chính Poznote chỉ khớp email khi email đã được xác minh, còn một nhà cung cấp cho phép
người dùng tự sửa các trường đó có thể tạo kẽ hở để mạo danh hồ sơ khác. Hãy cân nhắc
kỹ trước khi bật tùy chọn này.

Một giá trị khớp với hai hồ sơ sẽ bị từ chối vì mơ hồ, và một danh tính không khớp
với hồ sơ nào sẽ bị từ chối thẳng: hệ thống không bao giờ lùi về hồ sơ mặc định,
bởi hồ sơ mặc định là hồ sơ 1, tức quản trị viên đầu tiên. Hồ sơ đã bị vô hiệu hóa
cũng không bao giờ được xét làm ứng viên khớp.

Hai hệ quả đáng lưu ý trước khi bật tính năng này:

- **Tham số `user_id` truyền tường minh chỉ được phép trùng với hồ sơ đã phân giải.**
  Hầu hết công cụ đều nhận tham số này, nên truyền một hồ sơ khác sẽ bị từ chối
  thay vì thực thi.
- **Các công cụ không nhận `user_id`** (`get_system_info`, `list_backups`,
  `create_backup`, `delete_backup`) chạy theo hồ sơ mặc định của server, nên
  chỉ những người gọi được phân giải sang hồ sơ quản trị viên mới dùng được.

Khi đã đặt `POZNOTE_MCP_AUTH_PROVIDER`, nó được ưu tiên hơn
`POZNOTE_MCP_AUTH_TOKEN`, và server sẽ ghi cảnh báo vào log nếu token kia vẫn còn
được thiết lập.

#### Phạm vi công cụ (Tool scope)

Mặc định server mở toàn bộ công cụ. `POZNOTE_MCP_SCOPE` giới hạn quyền ở một trong ba mức, rất hữu ích cho các agent chạy tự động không có người giám sát, vì nội dung bên trong ghi chú có thể dẫn dụ nó gọi những công cụ lẽ ra không bao giờ được phép gọi:

| mức | công cụ |
|---|---|
| `read` | chỉ gồm các công cụ không làm thay đổi gì: get, list, search, backlinks, revisions, trạng thái chia sẻ, thông tin hệ thống, cài đặt |
| `write` | `read`, cộng thêm các thay đổi có thể hoàn tác được: ghi chú, task, lời nhắc, thư mục, di chuyển, tệp đính kèm, đưa ghi chú vào thùng rác, khôi phục từ thùng rác hoặc từ một bản sửa đổi |
| `admin` *(mặc định)* | mọi thứ, bao gồm cả những thao tác không thể hoàn tác (dọn sạch thùng rác, xóa vĩnh viễn khỏi thùng rác), workspace, sao lưu, Git sync, cài đặt ứng dụng và chia sẻ công khai |

```bash
# Trong tệp .env
POZNOTE_MCP_SCOPE=read

# Tạo lại container MCP để áp dụng biến môi trường mới
docker compose up -d --force-recreate mcp-server
```

Công cụ nào vượt quá mức cho phép sẽ không được đăng ký luôn: client không nhìn thấy nó, và mọi lệnh gọi tới nó bị từ chối như một công cụ không tồn tại, bất kể client nhận được chỉ dẫn gì. Log khởi động sẽ ghi rõ mức đang áp dụng và số lượng công cụ được mở. Một giá trị không hợp lệ sẽ khiến server dừng lại thay vì tự lùi về `admin`.

Khi dùng token dùng chung, mức scope áp dụng cho toàn bộ server: để cấp hai mức khác nhau cho hai client, hãy chạy thêm một MCP container thứ hai với `POZNOTE_MCP_SCOPE`, cổng và `POZNOTE_MCP_AUTH_TOKEN` riêng.

Với cơ chế [xác thực theo từng người gọi](#xác-thực-theo-từng-người-gọi-tùy-chọn), mỗi bên gọi có thể nhận mức scope riêng từ một claim trong token của mình. `POZNOTE_MCP_SCOPE_MAP` liệt kê các cặp `<claim value>=<level>`, đọc từ claim có tên trong `POZNOTE_MCP_SCOPE_CLAIM` (mặc định là `scope`, tức chuỗi các OAuth scope phân tách bằng dấu cách; các claim dạng danh sách như `groups` hay `roles` cũng dùng được):

```bash
# Các OAuth scope được nhà cung cấp danh tính cấp cho từng client
POZNOTE_MCP_SCOPE_MAP=poznote.read=read,poznote.write=write,poznote.admin=admin

# Hoặc groups, đối với các nhà cung cấp đưa danh sách nhóm vào token
POZNOTE_MCP_SCOPE_CLAIM=groups
POZNOTE_MCP_SCOPE_MAP=/poznote-agents=read,/poznote-users=write,/poznote-admins=admin
```

Mỗi người gọi nhận mức cao nhất mà claim của họ ánh xạ tới, nhưng không bao giờ vượt quá `POZNOTE_MCP_SCOPE`, và các công cụ cao hơn mức đó sẽ bị ẩn khỏi danh sách công cụ cũng như bị từ chối nếu bị gọi. Người gọi có claim không ánh xạ tới mức nào sẽ bị từ chối thẳng (`401`) thay vì được hưởng mức chung của server, và lý do được ghi vào log. Nếu không đặt `POZNOTE_MCP_SCOPE_MAP`, mọi người gọi đều nhận mức của server.

Mỗi công cụ cũng gắn sẵn các chú thích chuẩn MCP `readOnlyHint` và `destructiveHint`, nên các client có cơ chế tự lọc hoặc hỏi xác nhận người dùng có thể dựa vào đó.

#### Chế độ Debug

Đặt `POZNOTE_DEBUG=true` trong lệnh khởi chạy để chuyển mức log từ `INFO` sang `DEBUG`. Đặt lại thành `false` khi sử dụng bình thường. Hệ thống chỉ nhận đúng giá trị chữ thường `true` và `false`. Mọi giá trị khác đều bị xem là `false` và một cảnh báo sẽ được ghi vào log MCP. Web server dễ tính hơn khi chấp nhận cả `1`, `on` hoặc `yes`. Mọi yêu cầu HTTP gửi tới Poznote API, mọi lệnh gọi công cụ nhận từ trợ lý AI và mọi phản hồi đều được ghi chi tiết vào log của container. Hãy dùng chế độ này khi cần chẩn đoán lỗi kết nối hoặc xác thực:

```bash
docker compose logs -f mcp-server
```

Hãy tắt chế độ này khi dùng thông thường, vì log quá chi tiết là không cần thiết trong sinh hoạt hằng ngày.

### Khởi động Server

```bash
docker compose up -d
```

### Kiểm tra cài đặt

```bash
# Kiểm tra container đang chạy
docker ps | grep mcp

# Thử gọi endpoint
curl http://127.0.0.1:8045/mcp
```

Để tắt MCP server, hãy comment bỏ service `mcp-server` trong tệp `docker-compose.yml`.

---

## Thiết lập Client

Cấu hình trợ lý AI của bạn để kết nối tới MCP server:

### **VS Code Copilot**
Hướng dẫn thiết lập đầy đủ: **[VSCODE-COPILOT.md](VSCODE-COPILOT.vi.md)**

### **Claude CLI**
Hướng dẫn thiết lập đầy đủ: **[CLAUDE-CLI.md](CLAUDE-CLI.vi.md)**

### **ChatGPT, Claude Desktop / claude.ai, Gemini**
Các ứng dụng chat đăng nhập qua Poznote: xem **[Đăng nhập từ các ứng dụng chat](#đăng-nhập-từ-các-ứng-dụng-chat-chatgpt-claude-gemini)**.

---

## Bảo mật

Những gì một client truy cập được vào endpoint MCP có thể làm phụ thuộc vào [chế độ](#chọn-chế-độ-phù-hợp-với-nhu-cầu) đang dùng.

**Chế độ Classic** (mặc định). Bất kỳ ai tiếp cận được endpoint đều có thể đọc, tạo, sửa và xóa mọi ghi chú của mọi hồ sơ (các công cụ đều nhận tham số `user_id`), đồng thời có thể kích hoạt sao lưu, khôi phục và thay đổi cài đặt. Có hai lớp bảo vệ giúp tránh rủi ro:

1. **Phạm vi truy cập mạng.** Mặc định endpoint chỉ có thể truy cập từ chính máy cục bộ.
2. **Bearer token đầu vào** (tùy chọn). Đặt `POZNOTE_MCP_AUTH_TOKEN` để mọi yêu cầu bắt buộc phải kèm header `Authorization: Bearer <token>`.

Với `docker-compose.yml` mặc định, chỉ riêng lớp 1 là đã đủ. Hãy bổ sung thêm lớp 2 bất cứ khi nào cổng được mở ra nơi bạn không kiểm soát hoàn toàn.

**Đăng nhập từ các ứng dụng chat và xác thực theo từng người gọi.** Mọi yêu cầu đều phải mang một token gắn với tài khoản của một cá nhân, nên client chỉ truy cập được tài khoản đó ở đúng mức quyền được cấp. Trong trường hợp này, endpoint được chủ ý mở ra Internet phía sau HTTPS để các ứng dụng chat kết nối từ server của chúng.

Ở mọi chế độ, [phạm vi công cụ](#phạm-vi-công-cụ-tool-scope) tiếp tục thu hẹp những gì một client được phép làm.

### Vì sao chỉ lắng nghe trên 127.0.0.1 vừa bình thường vừa an toàn

Container MCP lắng nghe trên `0.0.0.0` *bên trong* container, điều Docker cần để ánh xạ cổng hoạt động, nhưng cổng chỉ được công bố **duy nhất trên `127.0.0.1`** của máy host, tuyệt đối không mở ra giao diện mạng công khai:

```yaml
ports:
  - "127.0.0.1:${POZNOTE_MCP_PORT:-8045}:8045"
```

Đây là thiết lập có chủ đích và chuẩn xác: chỉ những tiến trình chạy trên cùng máy (hoặc các SSH tunnel do bạn chủ động thiết lập) mới kết nối được. Không có gì phải lo ngại với cấu hình mặc định này.

### Chạy MCP server bên ngoài Docker

Nếu bạn cài đặt MCP server bằng `pip` và tự chạy `poznote-mcp serve` (systemd, Proxmox LXC, ...), sẽ không có lớp ánh xạ cổng của Docker đứng chắn phía trước, nên địa chỉ bind rất quan trọng:

- `poznote-mcp serve` mặc định bind vào **`127.0.0.1`**. Hãy giữ nguyên mặc định này trừ khi bạn biết rõ vì sao cần thay đổi.
- Nếu bắt buộc phải bind vào `0.0.0.0` (reverse proxy trên máy chủ khác, giao diện VPN), hãy đặt thêm `POZNOTE_MCP_AUTH_TOKEN`. Server sẽ ghi một cảnh báo lúc khởi động nếu lắng nghe trên địa chỉ không phải loopback mà chưa có token.
- Các phiên bản cũ hơn mặc định bind vào `0.0.0.0`: hãy truyền tường minh `--host=127.0.0.1` (hoặc đặt `MCP_HOST=127.0.0.1` khi chạy không qua lệnh con `serve`).

### Truy cập từ xa

Ở chế độ classic, nếu Poznote chạy trên một máy chủ từ xa và bạn muốn kết nối từ máy trạm của mình, hãy dùng chuyển tiếp cổng SSH (SSH port forwarding) và **không** mở cổng ra công khai (với [đăng nhập từ các ứng dụng chat](#đăng-nhập-từ-các-ứng-dụng-chat-chatgpt-claude-gemini) thì việc mở qua HTTPS là bắt buộc theo thiết kế nên mục này không áp dụng):

```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Sau đó trỏ trợ lý AI của bạn tới `http://127.0.0.1:8045/mcp` như bình thường.

### Môi trường production

Nếu bắt buộc phải định tuyến MCP server qua mạng, hãy bảo vệ nó bằng:
- `POZNOTE_MCP_AUTH_TOKEN` (xem [Token xác thực đầu vào](#token-xác-thực-đầu-vào)), hoặc [đăng nhập qua Poznote](#đăng-nhập-từ-các-ứng-dụng-chat-chatgpt-claude-gemini) để mỗi client có token thu hồi được gắn với một tài khoản riêng, kèm HTTPS phía trước để token không truyền đi ở dạng văn bản thuần
- Một VPN (Tailscale, WireGuard)
- Tùy chọn dùng reverse proxy có cơ chế xác thực riêng hoặc danh sách IP được phép (nginx, Caddy) làm lớp bảo vệ bổ sung, ngoại trừ khi dùng đăng nhập từ các ứng dụng chat: các ứng dụng này kết nối từ các dải địa chỉ riêng luôn thay đổi và không thể vượt qua một màn hình đăng nhập thứ hai, nên endpoint và các tài liệu `/.well-known/` của nó phải luôn truy cập được

### Cách MCP server xác thực với Poznote

MCP server kết nối tới Poznote REST API bằng một Bearer token nội bộ lưu tại `data/.mcp_token`. Poznote tự động tạo token này và cấu hình Docker Compose gắn `./data` ở chế độ chỉ đọc vào container MCP nên token không bao giờ cần nằm trong `.env`.

Nhờ token này giúp nhận diện MCP server, Poznote sẽ chụp một snapshot của ghi chú ngay trước khi một yêu cầu mang token đó làm thay đổi nội dung hoặc task của ghi chú (`update_note`, `add_task`, `update_task`, `complete_task`, `delete_task`, `add_subtask`, `update_subtask`, `delete_subtask`). Bản chụp này hiển thị dưới tên "Before MCP edit" trên trang **Revisions** của ghi chú, nhờ vậy một lần AI viết lại làm mất nội dung có thể được khôi phục chỉ bằng một cú nhấp chuột. Sẽ không có snapshot mới nào được chụp nếu bản mới nhất đã lưu cùng nội dung đó, và tối đa 20 snapshot an toàn gần nhất (Before AI edit và Before MCP edit) được giữ lại cho mỗi ghi chú; bạn có thể tăng giới hạn này trong **Settings → Revisions** (tối đa 200) nếu MCP server chỉnh sửa đủ nhiều để trôi qua 20 bản chỉ trong một buổi chiều.

---

## Ví dụ sử dụng

Sau khi cấu hình xong, bạn có thể tương tác với Poznote bằng ngôn ngữ tự nhiên:

```
Liệt kê tất cả ghi chú trong workspace 'Poznote'
Tìm kiếm các ghi chú về 'MCP'
Tạo một ghi chú có tiêu đề 'Meeting Notes' về nội dung cuộc thảo luận
Cập nhật ghi chú 123 với nội dung mới
Di chuyển ghi chú 456 vào thư mục 'Projects'
```

Để xem ví dụ sử dụng chi tiết và cách khắc phục sự cố:
- VS Code Copilot: [VSCODE-COPILOT.md](VSCODE-COPILOT.vi.md#ví-dụ-sử-dụng)
- Claude CLI: [CLAUDE-CLI.md](CLAUDE-CLI.vi.md#ví-dụ-sử-dụng)

---

## Hỗ trợ & Tài nguyên

- **[Thiết lập VS Code Copilot →](VSCODE-COPILOT.vi.md)**
- **[Thiết lập Claude CLI →](CLAUDE-CLI.vi.md)**

Khi gặp sự cố:
- Kiểm tra log của MCP server: `docker compose logs mcp-server`
- Xác minh Poznote API có thể truy cập được
- Xem các hướng dẫn khắc phục sự cố riêng cho từng client
