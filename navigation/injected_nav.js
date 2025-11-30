let inject_nav = () => {
  if (!document.URL.includes("vtopcc.vit.ac.in")) return;
  if (document.getElementById("viboot-navbar")) return;

  const navbarHeader = document.querySelector(".navbar");
  if (!navbarHeader) return;

  const container = document.createElement("div");
  container.id = "viboot-navbar";
  container. className = "navbar-brand";
  container.style. paddingTop = "20px";

  const createLink = (text, pageId) => {
    const link = document.createElement("a");
    link.textContent = text;
    link.className = "btnItem";
    link.style = "color: #fafafa; border-style: none; text-decoration: none; margin-left: 15px; font-size:15px; cursor: pointer;";
    link.href = "#";

    link.addEventListener("click", (e) => {
      e.preventDefault();
      
      const existingNavBtn = document.querySelector(`a[data-url="${pageId}"]`);
      if (existingNavBtn) {
        console.log('Found existing button, clicking it');
        existingNavBtn.click();
        return;
      }
    });

    return link;
  };

  container.appendChild(createLink("Attendance", "academics/common/StudentAttendance"));
  container.appendChild(createLink("Marks", "examinations/StudentMarkView"));
  container.appendChild(createLink("Calendar", "academics/common/CalendarPreview"));
  container.appendChild(createLink("Grade", "examinations/examGradeView/StudentGradeView"));
  // container.appendChild(createLink("History", "examinations/examGradeView/StudentGradeHistory"));
  navbarHeader.appendChild(container);
};

const initializeNavbar = () => {
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    inject_nav();
  } else {
    console.log('Navbar not found, retrying...');
    setTimeout(initializeNavbar, 1000);
  }
};

setTimeout(initializeNavbar, 1000);

if (typeof window. addEventListener !== 'undefined') {
  window.addEventListener('hashchange', initializeNavbar);
  window.addEventListener('popstate', initializeNavbar);
}