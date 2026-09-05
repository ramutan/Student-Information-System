import java.time.LocalDate;
import java.time.Period;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;

public record Student(
    String id,
    String name,
    Course course,
    YearLevel year,
    double gpa,
    String address,
    String phone,
    LocalDate dateOfBirth,
    String personalEmail,
    String perpetualEmail) {

  public Student {
    Objects.requireNonNull(id, "id");
    Objects.requireNonNull(name, "name");
    Objects.requireNonNull(course, "course");
    Objects.requireNonNull(year, "year");
    Objects.requireNonNull(address, "address");
    Objects.requireNonNull(phone, "phone");
    Objects.requireNonNull(dateOfBirth, "dateOfBirth");
    Objects.requireNonNull(personalEmail, "personalEmail");
    Objects.requireNonNull(perpetualEmail, "perpetualEmail");
    if (gpa < 0 || gpa > 4) {
      throw new IllegalArgumentException("gpa must be between 0.00 and 4.00, was " + gpa);
    }
  }

  public boolean isHonorRoll() {
    return gpa >= 3.7;
  }

  public int ageInYears() {
    return Period.between(dateOfBirth, LocalDate.now()).getYears();
  }
}

/** The academic programs the registrar tracks. Replaces the old raw String[] COURSES. */
enum Course {
  INFORMATION_TECHNOLOGY("Information Technology", "IT"),
  COMPUTER_SCIENCE("Computer Science", "CS");

  final String label;
  final String shortTag;

  Course(String label, String shortTag) {
    this.label = label;
    this.shortTag = shortTag;
  }

  static Optional<Course> fromLabel(String label) {
    return Arrays.stream(values()).filter(c -> c.label.equals(label)).findFirst();
  }
}

/** The four year levels. Replaces the old raw String[] YEARS. */
enum YearLevel {
  FIRST("1st Year"),
  SECOND("2nd Year"),
  THIRD("3rd Year"),
  FOURTH("4th Year");

  final String label;

  YearLevel(String label) {
    this.label = label;
  }

  static Optional<YearLevel> fromLabel(String label) {
    return Arrays.stream(values()).filter(y -> y.label.equals(label)).findFirst();
  }
}
