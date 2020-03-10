require("dotenv").config();

//const simpleGit = require("simple-git")(process.env.GITHUB_WORKSPACE);
const simpleGit = require("simple-git/promise");
const fs = require("fs");
const path = require("path");
//const git = simpleGit(process.env.GITHUB_WORKSPACE);
const git = simpleGit();

const filename = "CONTRIBUTORS.md";

async function main() {
  const status = await git.status();
  const commitHistory = await git.log();
  const { author_email, author_name } = commitHistory.all[0];
  console.log(status);
  const hasContri = status.files.filter(file =>
    file.path.includes("CONTRIBUTORS")
  );
  console.log(commitHistory);

  if (hasContri.length > 0) {
    // Do file editing and git add, git commit the changes
    //fs.writeFileSync('./')
  } else {
    // create file, add current author of PR and add to readme.md file
    const file = path.join(__dirname, filename);

    console.log(commitHistory.all[0]);
    console.log("CURRENT COMMIT ID", process.env.GITHUB_SHA);
    console.log(author_email, author_name);

    fs.writeFileSync(
      file,
      `- [@${author_name}](https://github.com/${author_name}/)`
    );
    git.addConfig("user.name", author_name);
    git.addConfig("user.email", author_email);
    git.add([file]);
    git.commit("committed CONTRIBUTORS.md file", [file], {
      "--author": '"CONTRIBUTIFY BOT <contri@test.com>"'
    });
    git.push(["-u", "origin", "master"], () => console.log("done"));

    //git add, git commit the changes
  }
}

main();
