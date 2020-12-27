var currentSkillIndex = 1;
var skills = document.querySelectorAll(".skill");

setInterval(f => {
  for (let i = skills.length - 1; i >= 0; i--) {
    skills[i].classList.remove("shown");
    skills[i].classList.add("hidden");
  }
  skills[currentSkillIndex].classList.add("shown");
  skills[currentSkillIndex].classList.remove("hidden");

  currentSkillIndex++;
  if (currentSkillIndex >= skills.length) {
    currentSkillIndex = 0;
  }
}, 2600);
