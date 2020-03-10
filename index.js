require("dotenv").config();

const git = require("nodegit");
//const testRepo = "https://github.com/r4pt0s/contributify";
const path = require("path");
const fs = require("fs");
const testRepo = process.env.GITHUB_WORKSPACE;

const nameVariations = ["contributors"];

addFile();
// This example opens a certain file, `README.md`, at a particular commit,
// and prints the first 10 lines as well as some metadata.
/* var _entry;
git.Repository.open(path.resolve(__dirname, "./.git"))
  .then(function(repo) {
    return repo.getCommit(process.env.GITHUB_SHA);
  })
  .then(function(commit) {
    let getFile = null;
    let blob = "";

    try {
      getFile = commit.getEntry("CONTRIBUTORS.md");
      return getFile;
    } catch (err) {
      console.log(err);
      return addFile().done();
    }

    console.log("getFILE: ", getFile);
  })
  .then(function(entry) {
    console.log(entry);
    _entry = entry;
    return _entry.getBlob();
  })
  .then(function(blob) {
    console.log(_entry.name(), _entry.sha(), blob.rawsize() + "b");
    console.log("========================================================\n\n");
    var firstTenLines = blob
      .toString()
      .split("\n")
      .slice(0, 10)
      .join("\n");
    console.log(firstTenLines);
    console.log("...");
  })
  .done(); */

function addFile() {
  var path = require("path");
  var fse = require("fs-extra");
  var fileName = "CONTRIBUTORS.md";
  var fileContent = "- TEST";
  var directoryName = "./";
  /**
   * This example creates a certain file `newfile.txt`, adds it to the git
   * index and commits it to head. Similar to a `git add newfile.txt`
   * followed by a `git commit`
   **/

  var repo;
  var index;
  var oid;

  git.Repository.open(process.env.GITHUB_WORKSPACE)
    .then(function(repoResult) {
      repo = repoResult;
      return fse.ensureDir(path.join(repo.workdir(), directoryName));
    })
    .then(function() {
      return fse.writeFile(path.join(repo.workdir(), fileName), fileContent);
    })
    .then(function() {
      return fse.writeFile(
        path.join(repo.workdir(), directoryName, fileName),
        fileContent
      );
    })
    .then(function() {
      return repo.refreshIndex();
    })
    .then(function(indexResult) {
      index = indexResult;
    })
    .then(function() {
      // this file is in the root of the directory and doesn't need a full path
      return index.addByPath(fileName);
    })
    .then(function() {
      // this file is in a subdirectory and can use a relative path
      return index.addByPath(path.posix.join(directoryName, fileName));
    })
    .then(function() {
      // this will write both files to the index
      return index.write();
    })
    .then(function() {
      return index.writeTree();
    })
    .then(function(oidResult) {
      oid = oidResult;
      return git.Reference.nameToId(repo, "HEAD");
    })
    .then(function(head) {
      return repo.getCommit(head);
    })
    .then(function(parent) {
      var author = git.Signature.now("CONTRIBUTIFY BOT", "contri@test.com");
      var committer = git.Signature.now("CONTRIBUTIFY BOT", "contri@test.com");

      return repo.createCommit("HEAD", author, committer, "message", oid, [
        parent
      ]);
    })
    .done(function(commitId) {
      console.log("New Commit: ", commitId);
    });
}

/* git
  .Clone(testRepo, "./tmp")
  // Look up this known commit.
  .then(function(repo) {
    // Use a known commit sha from this repository.
    console.log(repo.getMasterCommit());
    return repo.getMasterCommit();
  })
  // Look up a specific file within that commit.
  .then(function(commit) {
    return commit.getEntry("README.md");
  })
  // Get the blob contents from the file.
  .then(function(entry) {
    // Patch the blob to contain a reference to the entry.
    return entry.getBlob().then(function(blob) {
      blob.entry = entry;
      return blob;
    });
  })
  // Display information about the blob.
  .then(function(blob) {
    // Show the path, sha, and filesize in bytes.
    console.log(blob.entry.path() + blob.entry.sha() + blob.rawsize() + "b");

    // Show a spacer.
    console.log(Array(72).join("=") + "\n\n");

    // Show the entire file.
    console.log(String(blob));
  })
  .catch(function(err) {
    console.log(err);
  }); */
/* 
// Open the repository directory.
git.Repository.open(testRepo)
  // Open the master branch.
  .then(function(repo) {
    console.log("I OPENED THE REPO");
    return repo.getMasterCommit();
  })
  // Display information about commits on master.
  .then(function(firstCommitOnMaster) {
    // Create a new history event emitter.
    var history = firstCommitOnMaster.history();

    console.log(history);
    // Create a counter to only show up to 9 entries.
    var count = 0;

    // Listen for commit events from the history.
    history.on("commit", function(commit) {
      // Disregard commits past 9.
      if (++count >= 9) {
        return;
      }

      // Show the commit sha.
      console.log("commit " + commit.sha());

      // Store the author object.
      var author = commit.author();

      // Display author information.
      console.log("Author:\t" + author.name() + " <" + author.email() + ">");

      // Show the commit date.
      console.log("Date:\t" + commit.date());

      // Give some space and show the message.
      console.log("\n    " + commit.message());
    });

    // Start emitting events.
    history.start();
  });
 */
