const $ = selector => typeof selector === "string" ? document.querySelector(selector) : selector

const tabContent = $("#tab-content")
const appBox     = $("#app")


const aceEditors = {}
const globalAceEditorSettings = {
	minLines:        5,
	maxLines:        500,
	showPrintMargin: false,
}
const globalAceEditorCommands = [
	{
		name:     "addBlankLineBelow",
		bindKey:  {win: "Shift-Enter", mac: "Shift-Enter"},
		readOnly: false,
		exec(e){  //could be done better
			e.navigateLineEnd()
			e.insert("\n")
		},
	},
	{
		name:     "addBlankLineAbove",
		bindKey:  {win: "Control-Shift-Enter", mac: "Command-Shift-Enter"},
		readOnly: false,
		exec(e){
			e.navigateLineStart()
			e.insert("\n")
			e.navigateUp()
		},
	},
	{
		name:     "selectWord",
		bindKey:  {win: "Control-D", mac: "Command-D"},
		readOnly: true,
		exec(e){
			e.selection.selectWord()
		},
	},
]
let transpiler = null


///UI functions
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
function setHasClass(el, className, condition){
	condition
		? el.classList.add   (className)
		: el.classList.remove(className)
}
function createBasicAceEditor(el, options){
	const editor = ace.edit(el, {...globalAceEditorSettings, highlightActiveLine: false, ...options})
	editor.on("blur",  () => editor.setHighlightActiveLine(false))
	editor.on("focus", () => editor.setHighlightActiveLine(true))
	editor.setTheme(globalSettings.getEditorTheme())
	editor.session.setMode("ace/mode/latex")
	for(const command of globalAceEditorCommands)
		editor.commands.addCommand(command)

	return editor
}
function fakeMarkdownToHTML(text){
	return text.split(/(\r?\n){2,}/g)
		.map(line => line
			.replace(/`(.*?)`/g, (_, code) => `<span class="inline-code">${code}</span>`)
			.replace(/\[(.*?)]\((.+?)\)/g, (_, text, url) => `<a href="${url}" target="_">${text}</a>`)
		)
		.map(line => line[0] === "#"
			? `<div class="section-title">${line.slice(1)}</div>`
			: `<p>${line}<p>`
		)
		.join("")
	//maybe add <div class="section"> groups
}


class HideableArea {
	constructor(element){
		this.element = element
		this.hidden = false
	}

	get shown(){
		return !this.hidden
	}
	// set shown(value){  //probably shoudn't be used
	// 	this.hidden = !value
	// }

	hide(){
		this.hidden = true
		this.element.classList.add("hidden")
	}
	show(){
		this.hidden = false
		this.element.classList.remove("hidden")
	}
	toggle(){
		this.hidden ? this.show() : this.hide()
	}
}
class AreaToggleButton {
	constructor(area, button, render){  //! use render the first time the area is shown
		this.area = area
		this.button = button

		this.name = button.innerText
		button.onclick = () => this.click()
		if(render){
			this.render = render
			this.notRendered = true
			this.hidden = true
			area.hide()
		}
		else
			this.hidden = area.element.classList.contains("hidden")
		this.setButtonText()
	}
	click(){
		if(this.notRendered && this.hidden){
			this.render()
			this.notRendered = false
		}
		this.hidden = !this.hidden
		this.setButtonText()
		this.area.toggle()
		updateEditorWidths()  //maybe don't do this for every button
	}
	setButtonText(){
		this.button.innerText = (this.hidden ? "Show " : "Hide ") + this.name
	}
}
class Checkbox {
	constructor(button, initialState, handler){
		this.button = button
		this.handler = handler

		this.checked = initialState

		if(initialState)
			button.classList.add("checked")
		button.addEventListener("click", e => {
			this.checked = !this.checked
			setHasClass(this.button, "checked", this.checked)
			this.handler.call(this.button, this.checked, e)
		})
	}
}

class GlobalSettings {
	constructor(){
		this.darkMode = false
	}

	loadFromBrowser(){
		let data = localStorage.getItem("typesetting options global")
		if(data){
			data = JSON.parse(data)

			this.darkMode = data.darkMode

			this.updateDarkMode()
		}
		appBox.style.background = null
	}
	saveToBrowser(){
		localStorage.setItem("typesetting options global", JSON.stringify({
			darkMode: this.darkMode
		}))
	}

	toggleDarkMode(){
		this.darkMode = !this.darkMode
		this.updateDarkMode()
	}
	updateDarkMode(){
		if(this.darkMode) appBox   .setAttribute("dark-mode", true)
		else              appBox.removeAttribute("dark-mode")

		const editorTheme = this.getEditorTheme()
		for(const editor of Object.values(aceEditors))
			editor.setTheme(editorTheme)

		this.saveToBrowser()
	}
	getEditorTheme(){
		return this.darkMode ? "ace/theme/twilight" : "ace/theme/textmate"
	}
}




let globalSettings = new GlobalSettings()
globalSettings.loadFromBrowser()

let currentTab = new BasicTab()
currentTab.loadOptionsFromBrowser()
currentTab.render()


//!! remember to change the static resource fetch urls before uploading to github

/** TODO:
	~& something to append "\\\\" to the codecogs code
		+ only add it to the output box when codecogs is the only enabled rendering method
	~ make the readonly editor look a bit different from the normal ones
	~ make scrollbars look nice
	~+ add environments
		# not really useful
	~ settings
		** line wrap, font size, dark mode
	~~ editor tweaks
		~ make better syntax highlighting
		~+ add "add newline above", select word (or next instance of selected word), camel select, maybe more
		~+ change shortcuts for duplicate line, delete line, select word, indent selected lines
		~ better indenting, command-wrapping with backslash, easily delete a command and its brackets
		~ newline between brackets creates indented block
	~ strip unneccessary whitespace from codecogs request urls
		- have toMinifiedString() to go with toString()
			% will need to be aware of "\ ", "\text" and similar
				# treating $mathmode$ inside textmode as text wouldn't be awful
		& option for output box to show minified code instead of regular
		% actually necessary to remove "\n" and "\t" when "<" is present
	& svg/png/jpg/gif dropdown
	& a bunch of different rendering engines
		& a bunch of different wrappers to make formats work nicely
	~ list of added editor commands
	~ multiple named preambles, saved in localStorage
	& hide text output box
	~ use MathJax output as regular copyable svg
		+ [could be a bit hard/weird/annoying] make a setting for it
	~+ make some render functions async
	& scale math output
	& render options
		* font thickness/weight

	&++ some kind of animation when toggling multi-column

	%# give checkboxes way bigger click areas, including the label text
	~ toggle buttons look nicer, and show which state they're in
		- colors and/or {x/checkmark, eye, etc.}
	~ add both automatic state classes and custom hooks to AreaToggleButton
	~ split darkMode.css into global and tab-specific files, and/or merge  some of it with basic.css
	~~ big reactive-ish system
		~ classes for different collections of options, as well as for individual options
			~+ even option types like boolean, numerical, value from a list, text,
		~ all kinds of registering dependencies and updating the DOM when things are loaded or changed
			- setters that do things when the new value is different from the old value
		~ easy to serialize for localStorage
		~ there are long-term options, as well as short-term "options" (like a particular menu being open)
			#? maybe find a more general name than "option"

	~!! get the soonest publishable version with all the current changes, then add anything non-essential in the next update
	~~ possible future tabs: the WYSIWYG editor with macros, the huge typesetting language
		~+ dynamically load only the script dependencies for the current tab
		~+ move each tab to a sub-page (like `frogflint.github.io/typesetting/basic`)
			- the main page has a little card and description for each one
			- the tab bar is like normal hyperlinks
*/
