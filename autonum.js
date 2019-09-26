// Automatically numbers unnumbered lines.
// Supports GOTO Label

function AutomaticNumbering(contents, step) {
  const numbers = []
  const commands = []
  const labels = {}  // str => line number
  var num = 0
  if (!step) {
    step = 1
  }

  const raw = contents.split("\n")
  for (var i = 0; i < raw.length; i++) {
    /** @type {string} */
    var line = raw[i]
    if (line.trim() === "") {
      numbers.push("")
      commands.push(line)
      continue
    }

    const existing = line.match(/^(\d\d*)(.*)/)
    if (existing) {
      num = parseInt(existing[1])
      line = existing[2]
    }

    numbers.push(num)
    commands.push(line)

    const match = line.match(/^REM ([^:]*):$/)
    if (match) {
      labels[match[1]] = num
    }

    num += step
  }

  var result = ""

  const labelRef = "(GOTO|GOSUB) ([a-zA-Z][a-zA-Z0-9_\-]*)"
  for (var i = 0; i < numbers.length; i++) {
    const line = numbers[i]
    var command = commands[i]
    const matches = command.match(new RegExp(labelRef, "g"))
    if (!matches) {
      result += line + " " + command + "\n"
      continue
    }

    var comments = []

    for (var j = 0; j < matches.length; j++) {
      const match = matches[j].match(new RegExp(labelRef))
      const number = labels[match[2]]
      const label = match[2]
      command = command.replace(label, number)
      comments.push(match[1] + " " + label)
    }

    result += line + " " + command + " : REM " + comments.join(" : ") + "\n"
  }

  return result
}

if (typeof module !== "undefined") {
  // NodeJS
  const fs = require("fs")
  const contents = fs.readFileSync(process.stdin.fd)
  const result = AutomaticNumbering(contents.toString(), 1)
  console.log(result)
}
