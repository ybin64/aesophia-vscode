// ----------------------------------------------------------------------------
// Copyright (c) Nicklas Bystedt. All rights reserved.
// Licensed under the MIT License.
// See the LICENSE file in the project root for license information.
// ----------------------------------------------------------------------------

import * as path from 'path'

import {
	Position,
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver';

import {Map} from 'immutable'


import {
	FileParseError, FileParseWarning, FileParseErrWarn,

	Scanner, parse,
	ParseError, ErrWarnLocation, 
	TextParserResult,
	ParsedFileCache, createParsedFile,

	isExplicitStdlibUri,
	getExplicitStdlibContent,
	
	GetCompletionItemsArgs,
	getCompletionItems, CompletionItem as SophiaCompletionItem, CompletionItemType
} from 'aesophia-parser'

const _cache = new ParsedFileCache()

function _filename2Uri(filename : string) : string {
    return 'file://' + filename
}

export function validateTextDocument(uri : string, text : string) : Diagnostic[] {
	return _validateTextDocumentCache(_cache, uri, text)
}

export function onCompletion(tdp: TextDocumentPositionParams): CompletionItem[] {
	const f = _cache.getFile(tdp.textDocument.uri)

	if (f && f.ast) {

		const args : GetCompletionItemsArgs = {
			getNamespace : (con : string) => {
				const ns = _cache.getNamespace(con)
				if (ns) {
					return ns.ast
				}
			}
		}

		const items = getCompletionItems(args, f.ast, tdp.position.line + 1, tdp.position.character + 1)

		return items.map(i => _sophiaCompletionItem2CompletionItem(i))
	}

	return []
}

export function onCompletionResolve(item: CompletionItem): CompletionItem {
	return item
}

// -----------------------------------------------------------------------------

function _fileContentResolver(fileuri : string) : string | false {
    if (isExplicitStdlibUri(fileuri)) {
		return getExplicitStdlibContent(fileuri)
    }

    return false
} 

function _parseText(text : string) : TextParserResult {
    const scanner = new Scanner(text)
    return parse(scanner)
}

type _ParseFileResult = {
    errors : FileParseError[]
    warnings : FileParseWarning[]
}

function _validateTextDocumentCache(cache : ParsedFileCache, uri : string, text : string) : Diagnostic[] {
	cache.removeCachedFile(uri)

    const parseResult = _parseText(text)

    const result : _ParseFileResult = {
        warnings : parseResult.warnings,
        errors   : parseResult.errors
	}
		
    if (parseResult.ast) {
        const pf = createParsedFile({
            fileuri  : uri, 
            fileAst  : parseResult.ast,
            warnings : parseResult.warnings,
            errors   : parseResult.errors
        })

        cache.addParsedFile(pf, _fileContentResolver, _parseText)
        result.warnings = cache.getWarnings()
		result.errors   = cache.getErrors()
    }

	const diagnostics = _diagnosticsFromErrors(uri, result.errors)

	let ret : Diagnostic[] = []

	if (diagnostics.has(uri)) {
		ret = diagnostics.get(uri)!
	}

	return ret
}

export type UriDiagnosticMap = Map<string /* uri */, Diagnostic[]>

const _GenericLocation : ErrWarnLocation = {
	begin : {
		offset : 0,
		line   : 1,
		column   : 1
	},
	end : {
		offset : 0,
		line : 1,
		column : 1
	}
}

function _diagnosticsFromErrors(uri : string, errors : FileParseErrWarn[]) : UriDiagnosticMap {
	let filename = uri.replace(/^file\:\/\//, '');
    let file = path.basename(filename)
    let ret = Map<string, Diagnostic[]>()

    // Ensure that the file errors will be reset if there aren't any
    ret = ret.set(uri, [])

    function _diagErr(message : string, loc : ErrWarnLocation) : Diagnostic {

		const start : Position = {
			line: loc.begin.line - 1, 
			character: loc.begin.column - 1	
		}

		let end = start

		if ((loc.end.line > 0) && (loc.end.column)) {
			end = {
				line: loc.end.line - 1, 
				character: loc.end.column - 1 
			}
		}

        return {
            severity: DiagnosticSeverity.Error,
            range: {
                start: start,
                end: end
            },
            message: message,
            source: 'aesophia'
        };
    }

    function _addUriDiagnostic(uri : string, diag : Diagnostic) {
        let diagnostics = ret.get(uri)

        if (diagnostics === undefined) {
            diagnostics = []
            ret = ret.set(uri, diagnostics)
        }

        diagnostics.push(diag)
    }

    for (let err of errors) {
        let errLoc : ErrWarnLocation | undefined= err.location;

		//console.log(`@@ err.message="${err.message}" : errLoc=${errLoc}`)
        if (errLoc && errLoc.end) {
            errLoc.end.column += 1;
        } else {
			errLoc = _GenericLocation
		}

        if ((err.filename === undefined) || (path.basename(err.filename) === file)) {
            _addUriDiagnostic(uri, _diagErr(err.message, errLoc));
        } /*else if (err.rootURI && (path.basename(err.rootURI) === file) && err.rootLoc) {
            _addUriDiagnostic(uri, _diagErr(err.err.message, beginEndPos2ErrorLocation(err.rootLoc)));
        } */ else {
            // Error not in the parsed file 

            /*if (err.rootURI && (err.rootURI.length > 0) && err.rootLoc) {
                _addUriDiagnostic(filename2Uri(err.rootURI), _diagErr(err.message, beginEndPos2ErrorLocation(err.rootLoc)));
            } else */ {
                _addUriDiagnostic(_filename2Uri(err.filename), _diagErr(err.message, errLoc))
            }      
		}		
    }

    return ret;
}



// -----------------------------------------------------------------------------
// Completion

function _sophiaCompletionItem2CompletionItem(si : SophiaCompletionItem) : CompletionItem {
	const ret : CompletionItem = {
		kind : CompletionItemKind.Text,
		label : si.text
	}

	if (si.type === CompletionItemType.File) {
		ret.kind = CompletionItemKind.File
	} else if (si.type === CompletionItemType.Function) {
		ret.kind = CompletionItemKind.Function
	}
	
	return ret
}
