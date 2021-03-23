Most LaTeX-to-image renderers don't support custom commands, so I made this tool to emulate them.

I have plans to extend this help section with the next update.


# Editor interface


	In the preamble, define custom commands with regular `\newcommand` notation (or with the alias `\cmd`).

	Type LaTeX code using those custom commands into the equation box.

	Click "transpile" (or press ctrl-s) to translate the equation into vanilla LaTeX.

	The image output shows how [codecogs](https://codecogs.com/latex/eqneditor.php) will render it, but the text output is generic to any kind of LaTeX.


# Differences from LaTeX syntax

	This tool does not (yet?) emulate `\def`, `\let`, `\newenvironment`, or `\newcommand*`.

	This tool does not use semantic parsing, so `\catcode` and `\verb` will not be respected (but a lot of the time they will be untouched).

	There are no unmatched bracket errors. Reaching the end of the document closes all groups, and unexpected closing brackets are treated as regular text.

	`\newcommand` is only recognized in the preamble, and can use the name of an existing LaTeX command
	Comments with `%` are not included in the output (most TeX-to-image renderers don't support them anyways).
	`\%` still works fine.

	Because the tool does not know whether each build-in command takes optional argument or not, it assumes they all do (except for `\left`).
	You can still pass a square bracket character as a parameter with `\command{[}`, or type one after with `\command [`.


	Because the tool does not know how many non-optional arguments each built-in command takes, it can't know whether a zero-parameter command is being used as an implicit parameter (and should be auto-grouped) or not.
	For example, using `\cmd \d {\vec{d}}` and then `\abs\d` will not work properly, but changing to `\cmd \d {{\vec{d}}}` or `\abs{\d}` will.


# 3rd party services

	The amazing text input boxes are using the [Ace Editor](https://ace.c9.io/) library.
	It's not needed for the tool itself, but it makes it a lot more pleasant to type.

	The image previews take the generated output text and show you what [codecogs](https://codecogs.com/latex/eqneditor.php) (the rendering service also used by playposit) and [MathJax](https://www.mathjax.org/#demo) will do with it.
