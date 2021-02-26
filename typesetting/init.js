const tabContents = {
	basic: document.getElementsByClassName("tab-contents basic-transpiler")[0],
}
const previewImage = document.querySelector(".info-and-preview .preview-image")  //maybe move a bunch of this to basic.js
const errorLog = document.querySelector(".info-and-preview .error-log")
const helpBox = document.querySelector(".info-and-preview .help-text")

const helpButton = document.querySelector("#button-line .button.help")


const aceEditors = {}
const globalAceEditorSettings = {
	minLines: 5,
	maxLines: 500,
	showPrintMargin: false,
}
const globalAceEditorCommands = [
	{
		name: "addBlankLineBelow",
		bindKey: {win: "Shift-Enter", mac: "Shift-Enter"},
		exec(e){  //could be done better
			e.navigateLineEnd()
			e.insert("\n")
		},
		readOnly: false,
	},
	{
		name: "addBlankLineAbove",
		bindKey: {win: "Control-Shift-Enter", mac: "Command-Shift-Enter"},
		exec(e){
			e.navigateLineStart()
			e.insert("\n")
			e.navigateUp()
		},
		readOnly: false,
	},
	{
		name: "selectWord",
		bindKey: {win: "Control-D", mac: "Command-D"},
		exec(e){
			e.selection.selectWord()
		},
		readOnly: true,
	},
]


///UI functions
function updatePreviewImage(code){
	if(!previewImageEnabled)
		return

	previewImage.src = "https://latex.codecogs.com/svg.latex?" + code  //# no escaping necessary it seems
	previewImage.classList.add("loading")
}
function toggleHelp(){
	helpBox.classList.toggle("hidden")
	showingHelp = !showingHelp
	helpButton.innerText = showingHelp ? "Hide help" : "Help"
	updateEditorWidths()
}
function updateErrorLog(errors){
	removeAllElementChildren(errorLog)
	for(let error of errors){
		const el = document.createElement("div")
		el.classList.add("error-message")
		el.innerText = error.toString()
		errorLog.appendChild(el)
	}

	updateEditorWidths()
}
function updateEditorWidths(){
	for(const editor of Object.values(aceEditors))
		editor.resize()
}

///more general helper functions
const ensureArray = obj => Array.isArray(obj) ? obj : [obj]
function removeAllElementChildren(el){
	for(let child = el.lastChild; child; child = el.lastChild)
		el.removeChild(child)
}
function addEventsListener(el, events, handler){
	for(const event of events)
		el.addEventListener(event, handler)
}
function createBasicAceEditor(el, options){
	const editor = ace.edit(el, {...globalAceEditorSettings, highlightActiveLine: false, ...options})
	editor.on("blur",  () => editor.setHighlightActiveLine(false))
	editor.on("focus", () => editor.setHighlightActiveLine(true))
	editor.session.setMode("ace/mode/latex")
	for(const command of globalAceEditorCommands)
		editor.commands.addCommand(command)

	return editor
}


let previewImageEnabled = true
let showingHelp = false

previewImage.onload = () => {
	previewImage.classList.remove("loading")
	updateEditorWidths()
}

selectBasicTranspiler(tabContents.basic)


/** TODO:
	~ make the readonly editor look a bit different from the normal ones
	~+ add environments
		# not really useful
	~ settings
		** line wrap, font size, dark mode
	~~ editor tweaks
		~ shortcut to switch between document and preamble
		~ make better syntax highlighting
		~+ add "add newline above", select word, camel select, maybe more
		~+ change shortcuts for duplicate line, delete line, select word, indent selected lines
	~ strip unneccessary whitespace from codecogs request urls
		- have toMinifiedString() to go with toString()
			% will need to be aware of "\ ", "\text" and similar
				# treating $mathmode$ inside textmode as text wouldn't be awful
		& option for output box to show minified code instead of regular
*/
