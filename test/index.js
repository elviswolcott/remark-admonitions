const unified = require("unified");
const markdown = require("remark-parse");
const plugin = require("../lib");
const remark2rehype = require("remark-rehype");
const doc = require("rehype-document");
const format = require("rehype-format");
const html = require("rehype-stringify");
const vfile = require("to-vfile");
const report = require("vfile-reporter");
const diff = require("diff");
const colors = require("colors/safe");

let exit = 0;
// naive diff, works fine for short files
const diffVfile = (a, b) => {
  if (a.toString() !== b.toString()) {
    const changes = diff.diffLines(a.toString(), b.toString());
    const pretty = changes
      .map(group => {
        let text = group.value;
        if (group.added) {
          return text
            .trim()
            .split("\n")
            .map(line => `+ |${colors.green(line)}`)
            .join("\n");
        } else if (group.removed) {
          return text
            .trim()
            .split("\n")
            .map(line => `- |${colors.red(line)}`)
            .join("\n");
        } else {
          return text
            .trim()
            .split("\n")
            .map(line => `  |${line}`)
            .join("\n");
        }
      })
      .join("\n");
    return { same: true, pretty };
  } else {
    return { same: false, pretty: "" };
  }
};

const test = (options, filename) => {
  unified()
    .use(markdown)
    .use(plugin, options)
    .use(remark2rehype)
    .use(doc)
    .use(format)
    .use(html)
    .process(vfile.readSync("./test/sample.md"), (error, result) => {
      console.error(report(error || result));
      if (error) {
        throw error;
      }
      if (result) {
        result.basename = `${filename}.html`;
        vfile.writeSync(result);
        const ref = vfile.readSync(`./test/${filename}.ref`);
        const { same, pretty } = diffVfile(result, ref);
        if (same) {
          console.log(
            `${colors.red("Files do not match")} for ${filename} test.`
          );
          console.log(pretty);
          exit = 2;
        } else {
          console.log(`${colors.green("Files match")} for ${filename} test.`);
        }
      }
    });
};

const pluginOptions = {
  customTypes: {
    custom: {
      emoji: "💻",
      svg:
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 2H1c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h5.34c-.25.61-.86 1.39-2.34 2h8c-1.48-.61-2.09-1.39-2.34-2H15c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm0 9H1V3h14v8z"></path></svg>'
    }
  }
};

test(pluginOptions, "svg");
test({ ...pluginOptions, icons: "emoji" }, "emoji");

process.exit(exit);
