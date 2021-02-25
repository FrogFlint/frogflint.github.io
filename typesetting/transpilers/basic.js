function selectBasicTranspiler(tabContents){
	//all this is wrapped in a function so that I don't have to namespace it

	const preambleBox = tabContents.querySelector(".code-input.preamble .code-editor")
	const documentBox = tabContents.querySelector(".code-input.document .code-editor")
	const outputBox   = tabContents.querySelector(".code-output .code-editor")

	const preambleEditor = aceEditors.preamble = createBasicAceEditor(preambleBox, {placeholder: "preamble"})
	const documentEditor = aceEditors.document = createBasicAceEditor(documentBox, {placeholder: "equation"})
	const outputEditor   = aceEditors.output   = createBasicAceEditor(outputBox,   {placeholder: "output", readOnly: true})



	function transpile(){
		let [preambleTree] = parse(preambleEditor.getValue(), undefined, {inPreamble: true})
		const macros = createMacroList(preambleTree)

		let [tree] = parse(documentEditor.getValue())
		const errors = expandMacros(tree, macros)
		updateErrorLog(errors)

		const outputText = tree.join("")
		outputEditor.setValue(outputText, -1)

		updatePreviewImage(outputText)  //maybe move these outside
	}
	function parse(text, endTag, parseOptions = {}){
		let tree = []
		let optionalParamIsValid = false

		while(text.length){
			if(endTag){
				const end = strMatch(text, endTag, true)
				if(end) return [tree, text.slice(end[0].length)]
			}


			let token = null

			if(/^\\[^a-zA-Z]/.test(text)){
				tree.push(new Token("backslash code", "\\" + text[1], text[1]))
				text = text.slice(2)
				optionalParamIsValid = true
				continue
			}

			if(parseOptions.inPreamble && /^#\d/.test(text)){
				tree.push(new Token("placeholder", "#" + text[1], text[1]))
				text = text.slice(2)
				optionalParamIsValid = true
				continue
			}

			token = text.match(/^\\[a-zA-Z]+/)
			if(token){
				tree.push(new Token("command", token[0], token[0].slice(1)))
				text = text.slice(token[0].length)
				optionalParamIsValid = true
				if(token[0] === "\\left")  //or any command with no optional parameter
					optionalParamIsValid = false
				continue
			}

			if(text[0] === "{"){
				const [contents, remainder] = parse(text.slice(1), "}", parseOptions)
				tree.push(new Token("group", text.slice(0, text.length - remainder.length), "", contents))  //"text" parameter is unnecessary
				text = remainder
				optionalParamIsValid = false
				continue
			}
			if(optionalParamIsValid && text[0] === "["){
				const [contents, remainder] = parse(text.slice(1), "]", parseOptions)
				tree.push(new Token("optional parameter", text.slice(0, text.length - remainder.length), "", contents))  //"text" parameter is unnecessary
				text = remainder
				optionalParamIsValid = false  //pretty sure
				continue
			}

			if(/^\s/.test(text))
				tree.push(new Token("whitespace", text[0], text[0]))
			else {
				tree.push(new Token("text", text[0], text[0]))
				optionalParamIsValid = false
			}
			text = text.slice(1)
		}

		return [tree, text]
	}
	function createMacroList(tree){
		let macros = []
		for(let i = 0; i < tree.length; i++)
			if(tree[i].type === "command" && (tree[i].value === "newcommand" || tree[i].value === "cmd")){
				let j = i

				for(++j; tree[j].type === "whitespace"; j++);
				let name = tree[j]
				if(name.type === "command")
					name = name.value
				else name = name.children.find(child => child.type === "command").value

				let paramCount = 0, defaultParam = null, body = null
				for(++j; j < tree.length && !body; j++){
					const token = tree[j]

					if(token.type === "optional parameter" && !defaultParam){
						if(paramCount === 0)
							paramCount = +token.children.join("")
						else
							defaultParam = token  //maybe change to group
					}
					else if(token.type !== "whitespace")
						body = tokenEnsureGroup(token)
				}

				i = j
				macros.push(new CustomCommand(name, paramCount, defaultParam, body))
			}
		return macros
	}
	function expandMacros(tree, macros, savedNameList = null){
		const macroNames = savedNameList || macros.map(macro => macro.name)
		const errors = []

		for(let i = 0; i < tree.length; i++){
			const token = tree[i]
			if(token.type === "command" && macroNames.includes(token.value)){
				let macro = macros.find(macro => macro.name === token.value)

				let optionalParam = null, requiredParams = []
				let j = i + 1
				for(; j < tree.length && requiredParams.length < macro.expectedParams; j++){
					const arg = tree[j]  //- potentional parameter token
					if(arg.type === "optional parameter")
						optionalParam = arg
					else if(arg.type !== "whitespace")
						requiredParams.push(tokenEnsureGroup(arg))
				}

				const value = macro.expand(optionalParam, requiredParams)
				if(value instanceof ConversionError){
					errors.push(value)
					tree.splice(i, j - i)
				}
				else
					tree.splice(i, j - i, ...value)

				i--  //% so that the macro body can start with another macro
			}
			else if(token.children.length) //(token.type === "group")
				errors.push(...expandMacros(token.children, macros, macroNames))
		}

		return errors
	}

	class Token {
		constructor(type, text, value = "", children = []){
			this.type = type  //* command, backslash code, text, whitespace, group, optional parameter, placeholder
			this.text = text  //% might get merged with this.value
			this.value = value

			this.children = children
		}
		findDecendants(callback){
			if(this.children.length === 0)
				return []
			let matches = []
			for(const child of this.children){
				if(callback(child))
					matches.push(child)
				matches.push(...child.findDecendants(callback))
			}
			return matches
		}
		replaceDecendants(condition, replacer){
			for(let i = 0; i < this.children.length; i++){
				const child = this.children[i]
				if(condition(child)){
					let newValue = ensureArray(replacer(child))
					this.children.splice(i, 1, ...newValue)
					i += newValue.length - 1
				}
				else child.replaceDecendants(condition, replacer)
			}
		}
		copy(){
			return new Token(this.type, this.text, this.value, this.children.map(child => child.copy()))
		}
		copyAndReplace(condition, replacer){
			const newChildren = []
			for(const child of this.children)
				newChildren.push(condition(child) ? replacer(child) : child.copyAndReplace(condition, replacer))
			return new Token(this.type, this.text, this.value, newChildren.flat())
		}
		toString(){
			if(
				this.type === "text" ||
				this.type == "whitespace"
			)
				return this.value
			else if(
				this.type === "command" ||
				this.type === "backslash code"
			)
				return "\\" + this.value
			else if(this.type === "group")
				return "{" + this.children.join("") + "}"
			else if(this.type === "optional parameter")
				return "[" + this.children.join("") + "]"
		}
	}
	class CustomCommand {
		constructor(name, paramCount, defaultParam, body){
			this.name = name
			this.paramCount = paramCount
			this.defaultParam = defaultParam
			this.expectedParams = paramCount - (defaultParam !== null)
			this.body = body
		}
		expand(optionalParam, requiredParams){
			if(requiredParams.length !== this.expectedParams)
				return new ConversionError("missing parameters", this.name, requiredParams.length, this.expectedParams)

			const params = (this.defaultParam ? [optionalParam || this.defaultParam] : []).concat(requiredParams)
			return this.body.copyAndReplace(token => token.type === "placeholder", token => params[+token.value - 1].children).children
		}
	}
	class ConversionError {
		constructor(type, ...data){
			this.type = type
			this.data = data
		}
		toString(){
			if(this.type === "missing parameters")
				return `Error: the command \\${this.data[0]} expected ${this.data[2]} parameter${this.data[2] === 1 ? "" : "s"}, but only found ${this.data[1]}`
		}
	}

	function strMatch(str, pattern, justStart = false){
		if(typeof pattern === "string"){
			if(justStart)
				return str.startsWith(pattern) ? pattern : null
			else
				return str === pattern ? pattern : null
		}
		else if(pattern instanceof RegExp)
			return str.match(pattern)
	}
	const tokenEnsureGroup = token => token.type === "group" ? token : new Token("group", `{${token.text}}`, "", [token])

	///activation
	tabContents.querySelector(".transpile.button").onclick = transpile
	const transpileShortcut = {
		name: "transpile",
		description: "transpile",
		bindKey: {win: "Ctrl-S", mac: "Command-S"},
		exec: transpile,
	}
	preambleEditor.commands.addCommand(transpileShortcut)
	documentEditor.commands.addCommand(transpileShortcut)

	outputEditor.on("blur", () => outputEditor.selection.moveTo(0, 1))
}
