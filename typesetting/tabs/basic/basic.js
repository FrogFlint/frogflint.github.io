class BasicTab {
	constructor(){
		this.areas = {}
		this.buttons = {}
		this.options = {
			multiColumn: false,
			useCodecogs: true,
			useMathJax: true,
			wrapOutputInArray: false,  //+ move implementation (but not the setting itself) to the transpiler
		}
	}

	loadOptionsFromBrowser(){
		const data = localStorage.getItem("typesetting options basic")
		if(data){
			for(const [prop, value] of Object.entries(JSON.parse(data)))
				this.options[prop] = value

			this.updateMultiColumn()
		}
		appBox.style.background = null
	}
	saveOptionsToBrowser(){
		localStorage.setItem("typesetting options basic", JSON.stringify(this.options))
	}

	toggleMultiColumn(){
		this.options.multiColumn = !this.options.multiColumn
		this.updateMultiColumn()
		this.saveOptionsToBrowser()
	}
	updateMultiColumn(){
		if(this.options.multiColumn) tabContent   .setAttribute("multi-column", true)
		else                         tabContent.removeAttribute("multi-column")
	}

	updatePreviewImage(code){
		const img = this.areas.previewImage.element
		setHasClass(img, "hidden", !this.options.useCodecogs)
		if(this.options.useCodecogs){
			img.src = "https://latex.codecogs.com/svg.latex?" + code  //# no escaping necessary it seems
			img.classList.add("loading")
		}

		const jax = this.areas.previewHTML.element
		setHasClass(jax, "hidden", !this.options.useMathJax)
		if(this.options.useMathJax){
			jax.innerText = this.options.wrapOutputInArray
				? `\\[\\begin{array}{l}${code}\\end{array}\\]`
				: `\\[${code}\\]`
			MathJax.typeset()
		}
	}
	updateErrorLog(errors){
		const errorLog = this.areas.errorLog.element
		removeAllElementChildren(errorLog)
		for(let error of errors){
			const el = document.createElement("div")
			el.classList.add("error-message")
			el.innerText = error.toString()
			errorLog.appendChild(el)
		}

		updateEditorWidths()
	}


	render(){
		Promise.all([
				fetch("tabs/basic/basic.html"),  //#! for production
				fetch("tabs/basic/options.html"),
				fetch("tabs/basic/help.md"),
				// fetch("http://localhost/typesetting/tabs/basic/basic.html.php"),  //#! for development
				// fetch("http://localhost/typesetting/tabs/basic/options.html.php"),
				// fetch("http://localhost/typesetting/tabs/basic/help.md.php"),
			].map(promise => promise.then(response => response.text()))
		).then(([tabContentHTML, optionsHTML, helpText]) => {
				tabContent.innerHTML = tabContentHTML


				this.areas.editor       = new HideableArea($(".editor-area"))
				this.areas.help         = new HideableArea($(".info-and-preview .help-text"    ))
				this.areas.options      = new HideableArea($(".info-and-preview .options-box"  ))
				this.areas.errorLog     = new HideableArea($(".info-and-preview .error-log"    ))
				this.areas.previewImage = new HideableArea($(".info-and-preview .preview-image"))
				this.areas.previewHTML  = new HideableArea($(".info-and-preview .preview-html" ))

				this.buttons.help = new AreaToggleButton(
					this.areas.help,
					$(".button-line .button.help"),
					() => this.areas.help.element.innerHTML = fakeMarkdownToHTML(helpText)
				)
				this.buttons.options = new AreaToggleButton(
					this.areas.options,
					$(".button-line .button.options"),
					() => {
						const area = this.areas.options.element
						area.innerHTML = optionsHTML
						area.querySelector(".option.dark-mode").onclick = () => globalSettings.toggleDarkMode()
						area.querySelector(".option.multi-column").onclick = () => this.toggleMultiColumn()

						const renderOptions = [  //this whole thing is temp until I get a proper options system
							[".option.codecogs", "useCodecogs"],
							[".option.mathjax",  "useMathJax"],
							[".option.wrap-output-in-array", "wrapOutputInArray"],
						]
						for(const [selector, optionName] of renderOptions)
							this.buttons[optionName] = new Checkbox(  //maybe get different button names
								area.querySelector(selector),
								this.options[optionName],
								checked => {
									this.options[optionName] = checked
									this.saveOptionsToBrowser()
								}
							)
					}
				)


				this.areas.previewImage.element.onload = () => {
					this.areas.previewImage.element.classList.remove("loading")
					updateEditorWidths()
				}


				this.transpiler = new BasicTranspiler(this)

				aceEditors.preamble.setValue(localStorage.getItem("typesetting last basic preamble") || "", -1)
				aceEditors.document.setValue(localStorage.getItem("typesetting last basic equation") || "", -1)
			}
		)
	}
}
