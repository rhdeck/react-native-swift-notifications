const Path = require("path");
const fs = require("fs");
const glob = require("glob");
const PBXProject = require("@raydeck/xcode");
const PBXFile = require("@raydeck/xcode/lib/PBXFile");
const getTargets = require("@react-native-community/cli/build/commands/link/ios/getTargets")
  .default;
function linkXcodeProject(SLXCodeProjectPath, myMainPath) {
  const pwd = myMainPath ? myMainPath : process.cwd();
  const thisPath = SLXCodeProjectPath;
  const g = Path.join(pwd, "ios", "*.xcodeproj", "project.pbxproj");
  const rawgs = glob.sync(g);
  const gs = rawgs.filter(p => !p.includes("Pods.xc"));
  if (!gs || !gs.length) {
    process.exit();
  }
  const projPath = gs.shift();
  const thisProjectPath = Path.join(thisPath, "project.pbxproj");
  if (!fs.existsSync(thisPath)) {
    console.log("Could not find push notification project: ", thisPath);
    process.exit();
  }
  const relativePath = Path.relative(Path.join(pwd, "ios"), thisPath);
  const inText = fs.readFileSync(projPath, { encoding: "UTF8" });
  if (inText.indexOf(relativePath) > -1) {
    console.log("Already added");
    return;
  }
  var p = PBXProject.project(projPath).parseSync();
  var d = PBXProject.project(thisProjectPath).parseSync();
  const pfp = p.getFirstProject().firstProject;
  var group = p.getPBXGroupByKey(pfp.mainGroup);
  const libGroupObj = group.children.find(g => g.comment === "Libraries");
  var libGroup = { children: [] };
  if (libGroupObj) {
    libGroup = p.getPBXGroupByKey(libGroupObj.value);
  }
  //Add File reference
  const file = new PBXFile(relativePath);
  file.uuid = p.generateUuid();
  file.fileRef = p.generateUuid();
  p.addToPbxFileReferenceSection(file);
  //Add to libraries group

  libGroup.children.push({ value: file.fileRef, comment: file.basename });
  const pts = getTargets(p);
  // Add SL to my targets
  getTargets(d).forEach((dt, i) => {
    pts.forEach(t => {
      if (dt.isTVOS == t.isTVOS) {
        p.addStaticLibrary(dt.name, { target: t.uuid });
      }
    });
  });
  const out = p.writeSync();
  fs.writeFileSync(projPath, out);
}
module.exports = linkXcodeProject;
