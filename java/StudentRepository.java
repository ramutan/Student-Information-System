import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public final class StudentRepository {

  private final List<Student> students = new ArrayList<>();

  // ---------- storage ----------

  public synchronized void seed() {
    students.add(sample("26-0001-001", "Prince Ram", Course.INFORMATION_TECHNOLOGY, YearLevel.SECOND,
        3.95, "Phs6A Tierra Nevada Santa Ines Street General Trias Cavite", "+63 994 813 1740",
        "2025-2033-379", " princeram2305@gmail.com", " princeramroydliken@perpetual.edu.ph"));

  }

  private static Student sample(String id, String name, Course course, YearLevel year, double gpa,
      String address, String phone, String dob, String personalEmail, String perpetualEmail) {
    return new Student(id, name, course, year, gpa, address, phone, LocalDate.parse(dob),
        personalEmail, perpetualEmail);
  }

  public synchronized List<Student> all() {
    return List.copyOf(students);
  }

  public synchronized void add(Student student) {
    students.add(student);
  }

  /** Replaces the student with the given id, if present. */
  public synchronized boolean replace(String id, Student updated) {
    for (int i = 0; i < students.size(); i++) {
      if (students.get(i).id().equals(id)) {
        students.set(i, updated);
        return true;
      }
    }
    return false;
  }

  public synchronized void deleteById(String id) {
    students.removeIf(s -> s.id().equals(id));
  }

  /** Next student ID in YY-NNNN-NNN format, one higher than the largest existing one. */
  public synchronized String nextId() {
    int startingSequence = 26_000_000;
    int max = startingSequence;
    for (Student s : students) {
      try {
        max = Math.max(max, Integer.parseInt(s.id().replace("-", "")));
      } catch (NumberFormatException ignored) {
        // non-numeric legacy id — skip it, don't let it break generation
      }
    }
    String digits = String.format(Locale.US, "%09d", max + 1);
    return digits.substring(0, 2) + "-" + digits.substring(2, 6) + "-" + digits.substring(6);
  }

  public synchronized OptionalDouble averageGpa() {
    return students.stream().mapToDouble(Student::gpa).average();
  }

  public synchronized Optional<Student> topOfClass() {
    return students.stream().max(Comparator.comparingDouble(Student::gpa));
  }

  public synchronized long honorRollCount() {
    return students.stream().filter(Student::isHonorRoll).count();
  }

  public synchronized int size() {
    return students.size();
  }

  /** Applies a text search and an optional course filter, then sorts the result. */
  public synchronized List<Student> search(String query, Course courseFilter, SortField sort, boolean descending) {
    String normalizedQuery = query == null ? "" : query.toLowerCase(Locale.ROOT).trim();
    Comparator<Student> comparator = sort.comparator;
    if (descending) comparator = comparator.reversed();
    return students.stream()
        .filter(s -> courseFilter == null || s.course() == courseFilter)
        .filter(s -> normalizedQuery.isEmpty() || matches(s, normalizedQuery))
        .sorted(comparator)
        .toList();
  }

  private static boolean matches(Student s, String normalizedQuery) {
    String haystack = String.join(" ", s.name(), s.id(), s.personalEmail(), s.perpetualEmail(),
        s.course().label).toLowerCase(Locale.ROOT);
    return haystack.contains(normalizedQuery);
  }

  /** Table columns the student list can be sorted by. */
  public enum SortField {
    ID(Comparator.comparing(Student::id)),
    NAME(Comparator.comparing(Student::name, String.CASE_INSENSITIVE_ORDER)),
    GPA(Comparator.comparingDouble(Student::gpa));

    final Comparator<Student> comparator;

    SortField(Comparator<Student> comparator) {
      this.comparator = comparator;
    }

    public static SortField fromParam(String raw) {
      return switch (raw == null ? "" : raw) {
        case "name" -> NAME;
        case "gpa" -> GPA;
        default -> ID;
      };
    }
  }
}

/** Thrown when submitted form data fails validation; the message is safe to show the user. */
class ValidationException extends Exception {
  ValidationException(String message) {
    super(message);
  }
}

/**
 * Turns raw submitted form fields into a validated Student, or a specific
 * ValidationException explaining exactly what was wrong — instead of one
 * generic "please enter valid info" message for every possible mistake.
 */
final class StudentValidator {

  private static final Pattern PHONE = Pattern.compile("[+()\\d][\\d\\s().-]{6,}");
  private static final Pattern EMAIL = Pattern.compile("^\\S+@\\S+\\.\\S+$");

  private StudentValidator() {}

  static Student toStudent(Map<String, String> form, String id) throws ValidationException {
    String name = required(form, "name").trim();
    String address = required(form, "address").trim();
    String phone = required(form, "phone").trim();
    String personalEmail = required(form, "personalEmail").trim();
    String perpetualEmail = required(form, "perpetualEmail").trim();

    Course course = Course.fromLabel(required(form, "course"))
        .orElseThrow(() -> new ValidationException("Please choose a valid course."));
    YearLevel year = YearLevel.fromLabel(required(form, "year"))
        .orElseThrow(() -> new ValidationException("Please choose a valid year level."));

    if (name.isEmpty()) throw new ValidationException("Name is required.");
    if (address.isEmpty()) throw new ValidationException("Address is required.");
    if (!PHONE.matcher(phone).matches()) throw new ValidationException("Please enter a valid phone number.");
    if (!EMAIL.matcher(personalEmail).matches()) throw new ValidationException("Please enter a valid personal email.");
    if (!EMAIL.matcher(perpetualEmail).matches()) throw new ValidationException("Please enter a valid perpetual email.");

    LocalDate dob = parseDate(required(form, "dob"));
    double gpa = parseGpa(required(form, "gpa"));

    return new Student(id, name, course, year, gpa, address, phone, dob, personalEmail, perpetualEmail);
  }

  private static String required(Map<String, String> form, String key) throws ValidationException {
    String value = form.get(key);
    if (value == null) throw new ValidationException("Missing required field: " + key);
    return value;
  }

  private static LocalDate parseDate(String raw) throws ValidationException {
    try {
      return LocalDate.parse(raw);
    } catch (DateTimeParseException e) {
      throw new ValidationException("Please enter a valid date of birth.");
    }
  }

  private static double parseGpa(String raw) throws ValidationException {
    double gpa;
    try {
      gpa = Double.parseDouble(raw);
    } catch (NumberFormatException e) {
      throw new ValidationException("GPA must be a number.");
    }
    if (gpa < 0 || gpa > 4) throw new ValidationException("GPA must be between 0.00 and 4.00.");
    return gpa;
  }
}

/** Renders students as CSV or JSON. Two tiny, clearly-labeled jobs, kept together. */
final class StudentExporter {

  private StudentExporter() {}

  static String toCsv(List<Student> students) {
    StringBuilder out = new StringBuilder(
        "id,name,course,year,gpa,address,phone,date_of_birth,personal_email,perpetual_email\n");
    for (Student s : students) {
      out.append(csvField(s.id())).append(',')
          .append(csvField(s.name())).append(',')
          .append(csvField(s.course().label)).append(',')
          .append(csvField(s.year().label)).append(',')
          .append(String.format(Locale.US, "%.2f", s.gpa())).append(',')
          .append(csvField(s.address())).append(',')
          .append(csvField(s.phone())).append(',')
          .append(s.dateOfBirth()).append(',')
          .append(csvField(s.personalEmail())).append(',')
          .append(csvField(s.perpetualEmail())).append('\n');
    }
    return out.toString();
  }

  private static String csvField(String value) {
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }

  /** Real JSON (quoted keys, escaped values) — not a loose JS object literal. */
  static String toJson(List<Student> students) {
    return "[" + students.stream().map(StudentExporter::studentToJson).collect(Collectors.joining(",")) + "]";
  }

  private static String studentToJson(Student s) {
    return "{"
        + jsonField("id", s.id()) + ","
        + jsonField("name", s.name()) + ","
        + jsonField("course", s.course().label) + ","
        + jsonField("year", s.year().label) + ","
        + "\"gpa\":" + String.format(Locale.US, "%.2f", s.gpa()) + ","
        + jsonField("address", s.address()) + ","
        + jsonField("phone", s.phone()) + ","
        + jsonField("dob", s.dateOfBirth().toString()) + ","
        + jsonField("personalEmail", s.personalEmail()) + ","
        + jsonField("perpetualEmail", s.perpetualEmail())
        + "}";
  }

  private static String jsonField(String key, String value) {
    return "\"" + key + "\":\"" + escapeJson(value) + "\"";
  }

  private static String escapeJson(String s) {
    StringBuilder out = new StringBuilder(s.length());
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        default -> out.append(c);
      }
    }
    return out.toString();
  }
}
