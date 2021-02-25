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
	+ add parsing for comments
		- would have to not appear in the output (since they can go between arguments)
*/
