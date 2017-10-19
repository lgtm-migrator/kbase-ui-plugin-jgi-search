define([
    'knockout-plus',
    'bluebird',
    'kb_common/html',
    'kb_common/ui',
    '../utils',
    'yaml!../helpData.yml'
], function (
    ko,
    Promise,
    html,
    ui,
    utils,
    helpData
) {
    'use strict';

    var t = html.tag,
        p = t('p'),
        a = t('a'),
        blockquote = t('blockquote'),
        select = t('select'),
        option = t('option'),
        div = t('div'),
        span = t('span'),
        button = t('button'),
        input = t('input'),
        label = t('label');

    function buildHelpDialog(title) {
        return div({
            class: 'modal fade',
            tabindex: '-1',
            role: 'dialog'
        }, [
            div({ class: 'modal-dialog' }, [
                div({ class: 'modal-content' }, [
                    div({ class: 'modal-header' }, [
                        button({
                            type: 'button',
                            class: 'close',
                            // dataDismiss: 'modal',
                            ariaLabel: 'Done',
                            dataBind: {
                                click: 'close'
                            }
                        }, [
                            span({ ariaHidden: 'true' }, '&times;')
                        ]),
                        span({ class: 'modal-title' }, title)
                    ]),
                    div({ class: 'modal-body' }, [
                        div({
                            dataBind: {
                                component: {
                                    name: '"help"',
                                    params: {
                                        helpDb: 'helpDb'
                                    }
                                }
                            }
                        })
                    ]),
                    div({ class: 'modal-footer' }, [
                        button({
                            type: 'button',
                            class: 'btn btn-default',
                            // dataDismiss: 'modal',
                            // dataElement: 'ok',
                            dataBind: {
                                click: 'close'
                            }
                        }, 'Done')
                    ])
                ])
            ])
        ]);
    }

    function helpVM(node) {
        // var helpTopics = helpData.topics.map(function(topic) {
        //     return {
        //         id: topic.id,
        //         title: topic.title,
        //         content: topic.content
        //             // content: topic.content.map(function(paragraph) {
        //             //     return p(paragraph);
        //             // }).join('\n')
        //     };
        // });

        function close() {
            var backdrop = document.querySelector('.modal-backdrop');
            backdrop.parentElement.removeChild(backdrop);
            node.parentElement.removeChild(node);
        }

        return {
            helpDb: helpData,
            close: close
        };
    }

    function showHelpDialog() {
        var dialog = buildHelpDialog('JGI Search Help'),
            dialogId = html.genId(),
            helpNode = document.createElement('div'),
            kbaseNode, modalNode, modalDialogNode;

        helpNode.id = dialogId;
        helpNode.innerHTML = dialog;

        // top level element for kbase usage
        kbaseNode = document.querySelector('[data-element="kbase"]');
        if (!kbaseNode) {
            kbaseNode = document.createElement('div');
            kbaseNode.setAttribute('data-element', 'kbase');
            document.body.appendChild(kbaseNode);
        }

        // a node upon which to place Bootstrap modals.
        modalNode = kbaseNode.querySelector('[data-element="modal"]');
        if (!modalNode) {
            modalNode = document.createElement('div');
            modalNode.setAttribute('data-element', 'modal');
            kbaseNode.appendChild(modalNode);
        }

        modalNode.appendChild(helpNode);

        var backdropNode = document.createElement('div');
        backdropNode.classList.add('modal-backdrop', 'fade', 'in');
        document.body.appendChild(backdropNode);

        ko.applyBindings(helpVM(modalNode), helpNode);
        modalDialogNode = modalNode.querySelector('.modal');
        modalDialogNode.classList.add('in');
        modalDialogNode.style.display = 'block';
    }

    /*
    This view model establishes the primary search context, including the
    search inputs
    search state
    paging controls
    search results

    sub components will be composed with direct references to any of these vm pieces
    they need to modify or use.
     */
    function viewModel(params) {

        // Unpack the Search VM.
        var searchInput = params.search.searchInput;
        var searchResults = params.search.searchResults;
        var searchTotal = params.search.searchTotal;
        var searching = params.search.searching;
        var pageSize = params.search.pageSize;
        var page = params.search.page;

        var typeFilterOptions = params.search.typeFilterOptions.map(function (option) {
            return option;
        });
        typeFilterOptions.unshift({
            label: 'Select one or more file types',
            value: '_select_',
            enabled: true
        });

        function doHelp() {
            showHelpDialog();
        }

        function doRemoveTypeFilter(data) {
            params.search.typeFilter.remove(data);
        }

        function doSelectTypeFilter(data) {
            if (data.typeFilterInput() === '_select_') {
                return;
            }
            params.search.typeFilter.push(data.typeFilterInput());
            data.typeFilterInput('_select_');
        }

        var newProject = ko.observable();

        newProject.subscribe(function (newValue) {
            newValue = newValue.trim(' ');
            if (newValue.length === 0) {
                return;
            }
            params.search.projectFilter.push(parseInt(newValue));
            newProject('');
        });

        function doRemoveProject(data) {
            params.search.projectFilter.remove(data);
        }

        return {
            // The top level search is included so that it can be
            // propagated.
            search: params.search,
            // And we break out fields here for more natural usage (or not??)
            searchInput: searchInput,
            searchResults: searchResults,
            searchTotal: searchTotal,
            searching: searching,
            pageSize: pageSize,
            page: page,
            // Type filter
            typeFilterInput: ko.observable('_select_'),
            typeFilterOptions: typeFilterOptions,
            // Project filter
            newProject: newProject,
            projectFilter: params.search.projectFilter,
            doRemoveProject: doRemoveProject,

            // ACTIONS
            doHelp: doHelp,
            doSearch: params.search.doSearch,
            doRemoveTypeFilter: doRemoveTypeFilter,
            doSelectTypeFilter: doSelectTypeFilter
        };
    }

    /*
        Builds the search input area using bootstrap styling and layout.
    */
    function buildInputArea() {
        return div({
            class: 'form'
        }, div({
            class: 'input-group'
        }, [
            input({
                class: 'form-control',
                dataBind: {
                    textInput: 'searchInput',
                    hasFocus: true
                },
                placeholder: 'Search JGI Public Data'
            }),
            div({
                class: 'input-group-addon',
                style: {
                    cursor: 'pointer'
                },
                dataBind: {
                    click: 'doSearch'
                }
            }, span({
                class: 'fa',
                style: {
                    fontSize: '125%',
                    color: '#000',
                    width: '2em'
                },
                dataBind: {
                    // style: {
                    //     color: 'searching() ? "green" : "#000"'
                    // }
                    css: {
                        'fa-search': '!searching()',
                        'fa-spinner fa-pulse': 'searching()',
                    }
                }
            })),
            div({
                class: 'input-group-addon',
                style: {
                    cursor: 'pointer'
                },
                dataBind: {
                    click: 'doHelp'
                }
            }, span({
                class: 'fa fa-info'
            }))
        ]));
    }

    function buildTypeFilter() {
        return div({
            class: 'form-group'
        }, [
            label('Type'),
            select({
                dataBind: {
                    value: 'typeFilterInput',
                    event: {
                        change: '$component.doSelectTypeFilter'
                    },
                    foreach: 'typeFilterOptions'
                },
                class: 'form-control'
            }, [
                '<!-- ko if: enabled -->',
                option({
                    dataBind: {
                        value: 'value',
                        text: 'label',
                        enable: 'enabled'
                    }
                }),
                '<!-- /ko -->'
            ]),

            // selected types
            div({
                dataBind: {
                    foreach: 'search.typeFilter'
                },
                style: {
                    display: 'inline-block'
                }
            }, [
                span({
                    style: {
                        border: '1px silver solid',
                        borderRadius: '3px',
                        padding: '3px'
                    }
                }, [
                    span(({
                        dataBind: {
                            text: '$data'
                        },
                        style: {
                            padding: '3px'
                        }
                    })),
                    span({
                        dataBind: {
                            click: '$component.doRemoveTypeFilter'
                        },
                        class: 'kb-btn-mini'
                    }, 'x')
                ])
            ])
        ]);
    }

    function buildProjectFilter() {
        return div({
            class: 'form-group'
        }, [
            label({}, 'Projects'),
            input({
                dataBind: {
                    value: 'newProject'
                },
                placeholder: 'Filter by project id'
            }),
            div({
                style: {
                    display: 'inline-block'
                },
                dataBind: {
                    foreach: 'projectFilter'
                }
            }, [
                span({
                    style: {
                        border: '1px silver solid',
                        borderRadius: '3px',
                        padding: '3px'
                    }
                }, [
                    span(({
                        dataBind: {
                            text: '$data'
                        },
                        style: {
                            padding: '3px'
                        }
                    })),
                    span({
                        dataBind: {
                            click: '$component.doRemoveProject'
                        },
                        class: 'kb-btn-mini'
                    }, 'x')
                ])
            ])
        ]);
    }

    function buildFilterArea() {
        return [
            div({
                style: {
                    fontWeight: 'bold',
                    color: 'gray',
                    marginTop: '8px',
                    fontSize: '80%'
                }
            }, 'FILTERS'),
            div({
                class: 'form-inline',
                style: {

                }
            }, [
                buildTypeFilter(),
                buildProjectFilter()
            ])
        ];
    }

    function buildResultsArea() {
        return komponent({
            name: 'jgisearch/browser',
            params: {
                search: 'search'
            }
        });
    }

    function buildExample(text) {
        return span({
            style: {
                fontFamily: 'monospace',
                backgroundColor: 'rgba(247, 242, 225, 0.5)',
                fontWeight: 'bold',
                border: '1px gray solid',
                padding: '4px'
            }
        }, text);
    }

    function buildNoActiveSearch() {
        return div({
            style: {
                textAlign: 'left',
                maxWidth: '50em',
                margin: '0 auto'
            }
        }, [
            p('Hi, you don\'t have an active search, so there isn\'t anything to show you.'),
            p([
                'To start a search, simply type into the search box above. '
            ]),
            p([
                'To get back to this page any time, just remove all search conditions above!'
            ]),
            blockquote([
                'Try a very simple search: ', buildExample('coli'), '.'
            ]),
            p([
                'The search matches whole words against the entire ',
                a({
                    href: ''
                }, 'JAMO'),
                ' record. To search by just part of a word, use an asterisk wildcard (*) at the',
                ' beginning or end (or both!).'
            ]),
            blockquote([
                'Try ', buildExample('Escher'), '. No results? Just add an asterisk to the end ', buildExample('Escher*'), '.'
            ]),
            p([
                'All search terms are applied to narrow your search.'
            ]),
            blockquote([
                'Try ', buildExample('coli MG1655'),
            ]),
            p([
                'You may use one or more filters to additionally narrow down the search'
            ])
        ]);
    }

    function template() {
        return div({
            class: 'component_jgi-search_search'
        }, [
            // The search input area
            div({
                class: 'search-row'
            }, buildInputArea()),
            // The search filter area
            div({
                class: 'filter-row'
            }, buildFilterArea()),
            // The search results / error / message area
            div({
                class: 'result-row'
            }, [
                '<!-- ko if: search.userSearch() -->',
                buildResultsArea(),
                '<!-- /ko -->',
                '<!-- ko ifnot: search.userSearch() -->',
                div({
                    style: {
                        margin: '10px',
                        border: '1px silver solid',
                        padding: '8px',
                        backgroundColor: 'silver',
                        textAlign: 'center'
                    }
                }, buildNoActiveSearch()),
                '<!-- /ko -->'
            ])
        ]);
    }

    function component() {
        return {
            viewModel: viewModel,
            template: template()
        };
    }
    return component;
});
