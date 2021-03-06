/*jslint nomen:true*/
/*global define*/
define(['underscore', 'backbone', 'orotranslation/js/translator', 'routing', 'oro/dialog-widget', 'oroui/js/loading-mask',
    'orocalendar/js/form-validation', 'oroui/js/delete-confirmation', 'oroform/js/formatter/field'
], function (_, Backbone, __, routing, DialogWidget, LoadingMask, FormValidation, DeleteConfirmation, fieldFormatter) {
    'use strict';

    var $ = Backbone.$;

    /**
     * @export  orocalendar/js/calendar/event/view
     * @class   orocalendar.calendar.event.View
     * @extends Backbone.View
     */
    return Backbone.View.extend({
        /** @property {Object} */
        options: {
            widgetRoute: null,
            widgetOptions: null
        },

        /** @property {Object} */
        selectors: {
            loadingMaskContent: '.loading-content'
        },

        initialize: function (options) {
            this.options = _.defaults(_.pick(options || {}, _.keys(this.options)), this.options);
            this.viewTemplate = _.template($(options.viewTemplateSelector).html());
            this.template = _.template($(options.formTemplateSelector).html());

            this.listenTo(this.model, 'sync', this.onModelSave);
            this.listenTo(this.model, 'destroy', this.onModelDelete);
        },

        remove: function () {
            this.trigger('remove');
            this._hideMask();
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        onModelSave: function () {
            this.trigger('addEvent', this.model);
            this.eventDialog.remove();
            this.remove();
        },

        onModelDelete: function () {
            this.eventDialog.remove();
            this.remove();
        },

        render: function () {
            var widgetOptions = this.options.widgetOptions || {},
                defaultOptions = {
                    title: this.model.isNew() ? __('Add New Event') : __('View Event'),
                    stateEnabled: false,
                    incrementalPosition: false,
                    dialogOptions: _.defaults(widgetOptions.dialogOptions || {}, {
                        modal: true,
                        resizable: false,
                        width: 475,
                        autoResize: true,
                        close: _.bind(this.remove, this)
                    }),
                    submitHandler: _.bind(this.saveModel, this)
                },
                onDelete = _.bind(function (e) {
                    var $el = $(e.currentTarget),
                        deleteUrl = $el.data('url'),
                        confirm = new DeleteConfirmation({
                            content: $el.data('message')
                        });
                    e.preventDefault();
                    confirm.on('ok', _.bind(function () {
                        this.deleteModel(deleteUrl);
                    }, this));
                    confirm.open();
                }, this),
                onEdit = _.bind(function (e) {
                    this.eventDialog.setTitle(__('Edit Event'));
                    this.eventDialog.setContent(this.getEventForm());
                    // subscribe to 'delete event' event
                    this.eventDialog.getAction('delete', 'adopted', function (deleteAction) {
                        deleteAction.on('click', onDelete);
                    });
                }, this);

            if (this.options.widgetRoute) {
                defaultOptions.el = $('<div></div>');
                defaultOptions.url = routing.generate(this.options.widgetRoute, {id: this.model.originalId});
                defaultOptions.type = 'Calendar';
            } else {
                defaultOptions.el = this.model.isNew() ? this.getEventForm() : this.getEventView();
                defaultOptions.loadingMaskEnabled = false;
            }

            this.eventDialog = new DialogWidget(_.defaults(
                _.omit(widgetOptions, ['dialogOptions']),
                defaultOptions
            ));
            this.eventDialog.render();

            // subscribe to 'delete event' event
            this.eventDialog.getAction('delete', 'adopted', function (deleteAction) {
                deleteAction.on('click', onDelete);
            });
            // subscribe to 'switch to edit' event
            this.eventDialog.getAction('edit', 'adopted', function (editAction) {
                editAction.on('click', onEdit);
            });

            // init loading mask control
            this.loadingMask = new LoadingMask();
            this.eventDialog.$el.closest('.ui-dialog').append(this.loadingMask.render().$el);

            return this;
        },

        saveModel: function () {
            this.showSavingMask();
            try {
                this.model.save(this.getEventFormData(), {
                    wait: true,
                    error: _.bind(this._handleResponseError, this)
                });
            } catch (err) {
                this.showError(err);
            }
        },

        deleteModel: function (deleteUrl) {
            this.showDeletingMask();
            try {
                var options = {
                    wait: true,
                    error: _.bind(this._handleResponseError, this)
                };
                if (deleteUrl) {
                    options.url = deleteUrl;
                }
                this.model.destroy(options);
            } catch (err) {
                this.showError(err);
            }
        },

        showSavingMask: function () {
            this._showMask(__('Saving...'));
        },

        showDeletingMask: function () {
            this._showMask(__('Deleting...'));
        },

        _showMask: function (message) {
            if (this.loadingMask) {
                this.loadingMask.$el
                    .find(this.selectors.loadingMaskContent)
                    .text(message);
                this.loadingMask.show();
            }
        },

        _hideMask: function () {
            if (this.loadingMask) {
                this.loadingMask.hide();
            }
        },

        _handleResponseError: function (model, response) {
            this.showError(response.responseJSON || {});
        },

        showError: function (err) {
            this._hideMask();
            if (this.eventDialog) {
                FormValidation.handleErrors(this.eventDialog.$el.parent(), err);
            }
        },

        fillForm: function (form, modelData) {
            var self = this;
            form = $(form);

            self.buildForm(form, modelData);

            var inputs = form.find('[name]');
            var fieldNameRegex = /\[(\w+)\]/g;

            _.each(inputs, function (input) {
                input = $(input);
                var name = input.attr('name'),
                    matches = [],
                    match;

                while ((match = fieldNameRegex.exec(name)) !== null) {
                    matches.push(match[1]);
                }

                if (matches.length) {
                    var value = self.getValueByPath(modelData, matches);
                    if (input.is(':checkbox')) {
                        input.prop('checked', value);
                    } else {
                        input.val(value);
                    }
                    input.change();
                }
            });

            return form;
        },

        buildForm: function (form, modelData) {
            var self = this;
            form = $(form);
            _.each(modelData, function (value, key) {
                if (typeof value === 'object') {
                    var container = form.find('.' + key + '-collection');
                    if (container) {
                        var prototype = container.data('prototype');
                        if (prototype) {
                            _.each(value, function (collectionValue, collectionKey) {
                                container.append(prototype.replace(/__name__/g, collectionKey));
                            });
                        }
                    }

                    self.buildForm(form, value);
                }
            });
        },

        getEventView: function () {
            return this.viewTemplate(_.extend(this.model.toJSON(), {
                formatter: fieldFormatter
            }));
        },

        getEventForm: function () {
            var modelData = this.model.toJSON(),
                form = this.fillForm(this.template(modelData), modelData);
            form.find('[name]').uniform('update');
            return form;
        },

        getEventFormData: function () {
            var fieldNameRegex = /\[(\w+)\]/g,
                data = {},
                formData = this.eventDialog.form.serializeArray();
            formData = formData.concat(this.eventDialog.form.find('input[type=checkbox]:not(:checked)')
                .map(function () {
                    return {"name": this.name, "value": false};
                }).get());
            _.each(formData, function (dataItem) {
                var matches = [], match;
                while ((match = fieldNameRegex.exec(dataItem.name)) !== null) {
                    matches.push(match[1]);
                }

                if (matches.length) {
                    this.setValueByPath(data, dataItem.value, matches);
                }
            }, this);

            return data;
        },

        setValueByPath: function (obj, value, path) {
            var parent = obj, i;

            for (i = 0; i < path.length - 1; i++) {
                if (parent[path[i]] === undefined) {
                    parent[path[i]] = {};
                }
                parent = parent[path[i]];
            }

            parent[path[path.length - 1]] = value;
        },

        getValueByPath: function (obj, path) {
            var current = obj, i;

            for (i = 0; i < path.length; i++) {
                if (current[path[i]] == undefined) {
                    return undefined;
                }
                current = current[path[i]];
            }

            return current;
        }
    });
});
