import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;

public final class RegistrarServer {

  private static final int PORT = 8080;
  private final StudentRepository repository = new StudentRepository();

  public static void main(String[] args) throws IOException {
    new RegistrarServer().start();
  }

  public void start() throws IOException {
    repository.seed();
    HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
    server.createContext("/", this::handleHome);
    server.createContext("/save", this::handleSave);
    server.createContext("/delete", this::handleDelete);
    server.createContext("/csv", this::handleCsv);
    server.setExecutor(Executors.newCachedThreadPool());
    server.start();
    System.out.println("Registrar running at http://localhost:" + PORT);
  }

  private void handleHome(HttpExchange exchange) throws IOException {
    Map<String, String> params = HttpUtil.queryParams(exchange);
    String query = params.getOrDefault("q", "");
    Course courseFilter = Course.fromLabel(params.getOrDefault("course", "")).orElse(null);
    StudentRepository.SortField sort = StudentRepository.SortField.fromParam(params.get("sort"));
    boolean descending = "desc".equals(params.get("dir"));

    String html = HtmlView.render(repository, query, courseFilter, sort, descending);
    HttpUtil.sendHtml(exchange, html);
  }

  private void handleSave(HttpExchange exchange) throws IOException {
    Map<String, String> form = HttpUtil.formBody(exchange);
    String existingId = form.get("oldId");
    boolean isUpdate = existingId != null && !existingId.isBlank();

    try {
      String id = isUpdate ? existingId : repository.nextId();
      Student student = StudentValidator.toStudent(form, id);
      if (isUpdate) {
        repository.replace(existingId, student);
      } else {
        repository.add(student);
      }
      HttpUtil.redirect(exchange, "/");
    } catch (ValidationException e) {
      HttpUtil.redirect(exchange, "/?error=" + HttpUtil.urlEncode(e.getMessage()));
    }
  }

  private void handleDelete(HttpExchange exchange) throws IOException {
    String id = HttpUtil.formBody(exchange).get("id");
    if (id != null) repository.deleteById(id);
    HttpUtil.redirect(exchange, "/");
  }

  private void handleCsv(HttpExchange exchange) throws IOException {
    Map<String, String> params = HttpUtil.queryParams(exchange);
    String query = params.getOrDefault("q", "");
    Course courseFilter = Course.fromLabel(params.getOrDefault("course", "")).orElse(null);
    List<Student> students = repository.search(query, courseFilter, StudentRepository.SortField.ID, false);
    HttpUtil.sendCsvAttachment(exchange, StudentExporter.toCsv(students), "students.csv");
  }
}

/** Small stateless helpers for reading requests and writing responses. */
final class HttpUtil {

  private HttpUtil() {}

  static Map<String, String> queryParams(HttpExchange exchange) {
    return parseFormEncoded(exchange.getRequestURI().getRawQuery());
  }

  static Map<String, String> formBody(HttpExchange exchange) throws IOException {
    return parseFormEncoded(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
  }

  private static Map<String, String> parseFormEncoded(String raw) {
    Map<String, String> result = new HashMap<>();
    if (raw == null || raw.isEmpty()) return result;
    for (String pair : raw.split("&")) {
      String[] kv = pair.split("=", 2);
      if (kv.length == 2) {
        result.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
      }
    }
    return result;
  }

  static String urlEncode(String s) {
    return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
  }

  static String escapeHtml(String s) {
    if (s == null) return "";
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace("\"", "&quot;").replace("'", "&#39;");
  }

  static void redirect(HttpExchange exchange, String location) throws IOException {
    exchange.getResponseHeaders().set("Location", location);
    exchange.sendResponseHeaders(303, -1);
    exchange.close();
  }

  static void sendHtml(HttpExchange exchange, String html) throws IOException {
    send(exchange, html, "text/html");
  }

  static void sendCsvAttachment(HttpExchange exchange, String csv, String filename) throws IOException {
    exchange.getResponseHeaders().set("Content-Disposition", "attachment; filename=" + filename);
    send(exchange, csv, "text/csv");
  }

  private static void send(HttpExchange exchange, String body, String contentType) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=utf-8");
    exchange.sendResponseHeaders(200, bytes.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(bytes);
    }
  }
}

final class HtmlView {

  private HtmlView() {}

  static String render(StudentRepository repository, String query, Course courseFilter,
      StudentRepository.SortField sort, boolean descending) {
    List<Student> visible = repository.search(query, courseFilter, sort, descending);

    StringBuilder html = new StringBuilder(PageAssets.HEAD_AND_STYLE);
    html.append(header());
    html.append("<main>");
    html.append(stats(repository));
    html.append(toolbar(query, courseFilter, visible.size(), repository.size()));
    html.append(table(visible, sort, descending));
    html.append("</main>");
    html.append(PageAssets.FORM_AND_VIEW_MODALS);
    html.append("<script>const data=").append(StudentExporter.toJson(repository.all())).append(";</script>");
    html.append(PageAssets.CLIENT_SCRIPT);
    html.append(PageAssets.FOOTER);
    return html.toString();
  }

  private static String header() {
    return "<header><div class='brand'><div class='logo'>⌂</div>"
        + "<div><h1>REGISTRAR</h1><p>STUDENT INFORMATION MANAGEMENT</p></div></div>"
        + "<button class='primary' onclick='openForm()'>＋ ADD STUDENT</button></header>";
  }

  private static String stats(StudentRepository repository) {
    double avg = repository.averageGpa().orElse(0);
    Student top = repository.topOfClass().orElse(null);
    long honors = repository.honorRollCount();

    StringBuilder s = new StringBuilder("<section class='stats'>");
    s.append("<div class='stat'><span>♙ &nbsp; ENROLLED STUDENTS</span><b>").append(repository.size())
        .append("</b><small>").append(honors).append(" on the honors list</small></div>");
    s.append("<div class='stat'><span>♙ &nbsp; AVERAGE GPA</span><b>")
        .append(String.format(Locale.US, "%.2f", avg)).append("</b><small>across the whole registry</small></div>");
    s.append("<div class='stat'><span>♧ &nbsp; TOP OF CLASS</span><b>")
        .append(top == null ? "—" : HttpUtil.escapeHtml(top.name())).append("</b><small>")
        .append(top == null ? "no records"
            : String.format(Locale.US, "%.2f GPA · %s", top.gpa(), HttpUtil.escapeHtml(top.course().label)))
        .append("</small></div></section>");
    return s.toString();
  }

  private static String toolbar(String query, Course courseFilter, int visibleCount, int totalCount) {
    StringBuilder s = new StringBuilder();
    s.append("<form class='toolbar' method='get'><input name='q' value='").append(HttpUtil.escapeHtml(query))
        .append("' placeholder='⌕  Search by name, ID, email, or course…'>")
        .append("<select name='course' onchange='this.form.submit()'>")
        .append("<option value='all'").append(courseFilter == null ? " selected" : "").append(">All courses</option>");
    for (Course c : Course.values()) {
      s.append("<option value='").append(HttpUtil.escapeHtml(c.label)).append("'")
          .append(c == courseFilter ? " selected" : "").append(">").append(HttpUtil.escapeHtml(c.label)).append("</option>");
    }
    String coursesParam = courseFilter == null ? "all" : courseFilter.label;
    s.append("</select><span class='records'>").append(visibleCount).append(" of ").append(totalCount).append(" records</span>")
        .append("<a class='csv' href='/csv?q=").append(HttpUtil.urlEncode(query))
        .append("&course=").append(HttpUtil.urlEncode(coursesParam)).append("'>⇩ CSV</a></form>");
    return s.toString();
  }

  private static String table(List<Student> visible, StudentRepository.SortField sort, boolean descending) {
    StringBuilder s = new StringBuilder("<div class='table-wrap'><table><thead><tr>");
    s.append(sortHeader("Student ID", "id", sort, descending));
    s.append(sortHeader("Name", "name", sort, descending));
    s.append("<th>Course</th><th>Year</th><th>Perpetual Email</th>");
    s.append(sortHeader("GPA", "gpa", sort, descending));
    s.append("<th>Actions</th></tr></thead><tbody>");

    if (visible.isEmpty()) {
      s.append("<tr><td colspan='7' class='empty'>No records match your search.</td></tr>");
    }
    for (Student student : visible) s.append(row(student));
    s.append("</tbody></table></div>");
    return s.toString();
  }

  private static String sortHeader(String label, String field, StudentRepository.SortField sort, boolean descending) {
    boolean isActive = sort == StudentRepository.SortField.fromParam(field);
    String nextDirection = isActive && !descending ? "desc" : "asc";
    return "<th><a href='?sort=" + field + "&dir=" + nextDirection + "'>" + label + " ↕</a></th>";
  }

  private static String row(Student s) {
    String gpaClass = s.isHonorRoll() ? "high" : s.gpa() < 3 ? "low" : "mid";
    String encodedId = HttpUtil.urlEncode(s.id());
    return "<tr><td class='id'>" + HttpUtil.escapeHtml(s.id()) + "</td>"
        + "<td><strong>" + HttpUtil.escapeHtml(s.name()) + "</strong></td>"
        + "<td><span class='tag'>" + s.course().shortTag + "</span> " + HttpUtil.escapeHtml(s.course().label) + "</td>"
        + "<td>" + HttpUtil.escapeHtml(s.year().label) + "</td>"
        + "<td class='muted'>" + HttpUtil.escapeHtml(s.perpetualEmail()) + "</td>"
        + "<td><span class='gpa " + gpaClass + "'>" + String.format(Locale.US, "%.2f", s.gpa()) + "</span></td>"
        + "<td class='actions'>"
        + "<button onclick=\"view('" + encodedId + "')\">◉</button>"
        + "<button onclick=\"edit('" + encodedId + "')\">✎</button>"
        + "<form method='post' action='/delete' onsubmit=\"return confirm('Delete this record?')\">"
        + "<input type='hidden' name='id' value='" + HttpUtil.escapeHtml(s.id()) + "'>"
        + "<button class='danger'>♙</button></form></td></tr>";
  }
}

/** Static CSS/JS/modal markup that never changes per request — kept apart from the dynamic rendering above. */
final class PageAssets {

  private PageAssets() {}

  static final String HEAD_AND_STYLE =
      """
      <!doctype html><html><head><meta charset="utf-8">\
      <meta name="viewport" content="width=device-width,initial-scale=1">\
      <title>Registrar — Student Information Management</title><style>
      *{box-sizing:border-box}body{margin:0;background:#fafafa;color:#171717;font-family:Barlow,Arial,sans-serif;font-size:14px}
      header{height:82px;border-bottom:1px solid #dedede;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 5.5%}
      .brand{display:flex;align-items:center;gap:14px}.logo{width:40px;height:40px;background:#d71920;color:#fff;display:grid;place-items:center;font-size:24px}
      .brand h1{margin:0;font-family:Archivo,Arial,sans-serif;letter-spacing:3px;font-size:19px}
      .brand p{margin:4px 0 0;color:#777;font-size:10px;letter-spacing:2px}
      .primary{background:#171717;color:#fff;border:0;padding:12px 20px;font-weight:700;letter-spacing:1px;cursor:pointer}
      .primary:hover{background:#444}main{max-width:1180px;margin:0 auto;padding:34px 24px}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.stat{background:#fff;border:1px solid #ddd;padding:20px}
      .stat span{font-size:10px;color:#777;letter-spacing:1.4px;font-weight:700}
      .stat b{display:block;font-family:Archivo,Arial,sans-serif;font-size:26px;margin-top:15px}
      .stat small{display:block;color:#777;margin-top:4px}
      .toolbar{display:flex;align-items:center;gap:8px;margin:30px 0 12px}
      .toolbar input,.toolbar select{height:34px;border:1px solid #ccc;background:#fff;padding:0 11px;font:inherit}
      .toolbar input{width:270px}.toolbar select{width:205px}.records{margin-left:auto;color:#777;font-size:12px}
      .csv{border:1px solid #ccc;background:#fff;color:#171717;text-decoration:none;padding:8px 12px;font-size:12px}
      .table-wrap{overflow-x:auto;border:1px solid #ddd;background:#fff}table{width:100%;border-collapse:collapse;min-width:850px}
      th,td{text-align:left;padding:13px 10px;border-bottom:1px solid #e7e7e7;font-size:12px}th{background:#f2f2f2;font-size:11px}
      th a{color:inherit;text-decoration:none}.id{font-family:monospace;color:#777}.muted{color:#777}
      .tag,.gpa{display:inline-block;padding:4px 7px;background:#f0f0f0;font-size:10px}.gpa{font-weight:700}
      .gpa.high{background:#171717;color:#fff}.gpa.low{background:#fde8e8;color:#c1121f;border:1px solid #e6a3a3}
      .actions{display:flex;gap:3px;justify-content:flex-end}.actions button{background:none;border:0;cursor:pointer;font-size:15px}
      .actions .danger{color:#d71920}.empty{text-align:center;height:130px;color:#777}
      .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);align-items:center;justify-content:center;z-index:5}
      .modal{position:relative;background:#fff;width:min(650px,calc(100% - 30px));padding:25px 17px 18px;box-shadow:0 8px 30px #0004}
      .modal h2{font-family:Archivo,Arial,sans-serif;font-size:20px;margin:0 0 5px}.modal>p{font-size:11px;color:#777;margin:0 0 20px}
      .close{position:absolute;right:13px;top:10px;border:0;background:none;font-size:20px;cursor:pointer}
      .modal h3{font-size:10px;letter-spacing:.7px;margin:19px 0 7px}.modal label{display:block;font-size:11px;margin-bottom:11px}
      .modal input,.modal select{display:block;width:100%;height:30px;border:1px solid #ccc;padding:0 9px;margin-top:5px;font:inherit;background:#fff}
      .grid2,.grid3{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.grid3{grid-template-columns:1.2fr 1.2fr .9fr}
      .modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
      .modal-actions button{border:1px solid #ccc;background:#fff;padding:10px 16px;cursor:pointer}
      .modal-actions .primary{border:0;background:#171717}.modal dl{margin:20px 0}
      .modal dt{font-size:10px;letter-spacing:1px;color:#777;text-transform:uppercase;margin-top:12px}
      .modal dd{margin:3px 0;padding:9px;background:#f5f5f5}
      @media(max-width:700px){.stats{grid-template-columns:1fr}.toolbar{flex-wrap:wrap}.records{margin-left:0}
      .grid2,.grid3{grid-template-columns:1fr}header{padding:0 20px}.brand p{display:none}main{padding:22px 12px}}
      </style>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head><body>""";

  static final String FOOTER = "</body></html>";

  static final String FORM_AND_VIEW_MODALS =
      """
      <div id="modal" class="overlay"><div class="modal"><button class="close" onclick="closeForm()">×</button>\
      <h2 id="formTitle">Enroll a new student</h2><p id="formSub">The next record will be assigned automatically.</p>\
      <form method="post" action="/save" onsubmit="return validateForm()"><input type="hidden" id="oldId" name="oldId">\
      <h3>ACADEMIC INFORMATION</h3><label>Full name<input id="name" name="name" placeholder="e.g. Ada Lovelace"></label>\
      <div class="grid3"><label>Course<select id="course" name="course"><option value="">Choose…</option>\
      <option>Information Technology</option><option>Computer Science</option></select></label>\
      <label>Year level<select id="year" name="year"><option>1st Year</option><option>2nd Year</option>\
      <option>3rd Year</option><option>4th Year</option></select></label>\
      <label>GPA (0.00 – 4.00)<input id="gpa" name="gpa" type="number" min="0" max="4" step=".01" placeholder="3.50"></label></div>\
      <h3>PERSONAL INFORMATION</h3><div class="grid2"><label>Date of birth<input id="dob" name="dob" type="date"></label>\
      <label>Phone number<input id="phone" name="phone" placeholder="+63 917 555 0123"></label></div>\
      <label>Address<input id="address" name="address" placeholder="Street, barangay, city"></label>\
      <div class="grid2"><label>Personal email<input id="personalEmail" name="personalEmail" type="email" placeholder="name@gmail.com"></label>\
      <label>Perpetual email<input id="perpetualEmail" name="perpetualEmail" type="email" placeholder="name@perpetual.edu.ph"></label></div>\
      <div class="modal-actions"><button type="button" onclick="closeForm()">Cancel</button>\
      <button class="primary" id="saveBtn">Add student</button></div></form></div></div>\
      <div id="viewModal" class="overlay"><div class="modal">\
      <button class="close" onclick="document.getElementById('viewModal').style.display='none'">×</button>\
      <div id="viewBody"></div></div></div>""";

  static final String CLIENT_SCRIPT =
      """
      <script>
      function openForm(id){
        document.getElementById('modal').style.display='flex';
        document.querySelector('#modal form').reset();
        document.getElementById('oldId').value='';
        document.getElementById('formTitle').textContent='Enroll a new student';
        document.getElementById('saveBtn').textContent='Add student';
        if(id){
          const s=data.find(d=>d.id===id);
          if(!s)return;
          for(const key of ['name','course','year','gpa','address','phone','dob','personalEmail','perpetualEmail']){
            document.getElementById(key).value=s[key];
          }
          document.getElementById('oldId').value=s.id;
          document.getElementById('formTitle').textContent='Edit '+s.name;
          document.getElementById('saveBtn').textContent='Save changes';
        }
      }
      function closeForm(){ document.getElementById('modal').style.display='none'; }
      function edit(id){ openForm(id); }
      function view(id){
        const s=data.find(d=>d.id===id);
        if(!s)return;
        let ageSuffix='';
        try{
          const dob=new Date(s.dob), now=new Date();
          let age=now.getFullYear()-dob.getFullYear();
          if(now.getMonth()<dob.getMonth()||(now.getMonth()===dob.getMonth()&&now.getDate()<dob.getDate())) age--;
          ageSuffix=' ('+age+' yrs old)';
        }catch(e){}
        const gpaClass = s.gpa>=3.7 ? 'high' : (s.gpa<3 ? 'low' : 'mid');
        document.getElementById('viewBody').innerHTML =
          '<h2>'+escapeHtml(s.name)+'</h2>'+
          '<p class="id">'+escapeHtml(s.id)+'</p>'+
          '<p><span class="tag">'+escapeHtml(s.course)+'</span> <span class="tag">'+escapeHtml(s.year)+'</span> '+
          '<span class="gpa '+gpaClass+'">GPA '+Number(s.gpa).toFixed(2)+'</span></p>'+
          '<dl><dt>Date of birth</dt><dd>'+escapeHtml(s.dob)+ageSuffix+'</dd>'+
          '<dt>Phone</dt><dd>'+escapeHtml(s.phone)+'</dd>'+
          '<dt>Address</dt><dd>'+escapeHtml(s.address)+'</dd>'+
          '<dt>Personal email</dt><dd>'+escapeHtml(s.personalEmail)+'</dd>'+
          '<dt>Perpetual email</dt><dd>'+escapeHtml(s.perpetualEmail)+'</dd></dl>'+
          '<button class="primary" id="editFromView">✎ Edit record</button>';
        document.getElementById('editFromView').onclick=()=>openForm(s.id);
        document.getElementById('viewModal').style.display='flex';
      }
      function escapeHtml(str){
        const div=document.createElement('div');
        div.textContent=String(str);
        return div.innerHTML;
      }
      function validateForm(){
        const gpa=Number(document.getElementById('gpa').value);
        if(!document.getElementById('name').value.trim() || !document.getElementById('course').value
            || Number.isNaN(gpa) || gpa<0 || gpa>4){
          alert('Please complete the required fields and enter a GPA from 0.00 to 4.00.');
          return false;
        }
        return true;
      }
      const params=new URLSearchParams(location.search);
      if(params.has('error')) alert(params.get('error'));
      </script>""";
}
