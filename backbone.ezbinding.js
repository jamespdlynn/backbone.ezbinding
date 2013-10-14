/**
 * Backbone EZBinding Plugin
 * Version 0.8.0
 *
 * https://github.com/jeromegn/Backbone.localStorage
 */
(function (root, factory) {
    if (typeof exports === 'object' && typeof require === 'function') {
        module.exports = factory(require("underscore"), require("backbone"));
    } else if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["underscore","backbone"], function(_, Backbone) {
            // Use global variables if the locals are undefined.
            return factory(_ || root._, Backbone || root.Backbone);
        });
    } else {
        // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
        factory(_, Backbone);
    }
}(this, function(_, Backbone) {

    Backbone.EZBinder = function(el){
        this.el = el || 'body';
    };

    _.extend(Backbone.EZBinder.prototype, Backbone.Events, {

        _bindings : {},

        bind : function (model, property, selector, attr, bidirectional, bidirectionalEvent, autoRender){

            if  (!model || !(model instanceof Backbone.Model)){
                throw new Error("Invalid model passed as argument");
            }

            attr = attr || 'text';
            bidirectional = !!bidirectional;
            bidirectionalEvent = bidirectionalEvent || 'change';
            autoRender = (autoRender !== undefined) ? autoRender : true;

            var negate = false;
            if (typeof property == 'string'){
                negate = property.charAt(0) == '!';
                if (negate){
                    property = property.substring(1);
                }
            }

            var binding = {
                model : model,
                property : property,
                selector : selector,
                attr : attr,
                bidirectional : bidirectional,
                negate :  negate
            };

            this.$el = this.$el || Backbone.$(this.el);

            var bindings = this._bindings[model.cid];

            if (!bindings){
                //If we have no bindings for this model add listeners
                bindings = [binding];
                this.listenTo(model, 'change', this._onModelChange, this);
                this.listenTo(model, 'bind', this._onModelBind, this);
            }else{
                //Remove duplicates
                bindings = _.without(bindings, _.findWhere(bindings, {property: property, selector : selector, attr : attr}));
                bindings.push(binding);
            }

            if (typeof property === 'string' && model.get(property) === undefined){
                console.warn("Attempting to bind to a model that does not have the declared property: '"+property+"'.");
            }
            else if (autoRender){
                this._renderBinding(binding);
            }

            if (bidirectional){
                var evtName = bidirectionalEvent+'.dataBinder.'+model.cid;
                this.$el.on(evtName, selector, binding ,this._onElementChange);
            }

            this._bindings[model.cid] = bindings;
        },

        unbind : function (model, property, selector, attr){

            if  (!model || !(model instanceof Backbone.Model)){
                throw new Error("Invalid model passed as argument");
            }

            attr = attr || 'text';
            var bindings = this._bindings;

            if (bindings && bindings[model.cid] && bindings[model.cid][property]){
                var arr = bindings[model.cid][property];
                var obj = _.findWhere(arr, {selector : selector, attr : attr});


                //If array is empty then delete this binding from the models binding
                bindings[model.cid][property] = (arr.length <= 1) ? undefined : _.without(arr, obj);

                //If model has no more bindings then remove the event listener
                if (_.isEmpty(bindings[model.cid])){
                    bindings[model.cid] = undefined;
                    this.stopListening(model, 'change', this._onModelChange);
                }

                if (obj.bidirectional){
                    var eventName = '.dataBinder.'+model.cid;
                    this.$el.off(eventName, selector ,this._onElementChange);
                }
            }
            else {
                console.warn("Could not unbind model property: '"+property+"' ")
            }

        },

        unbindAll : function (model){

            if  (!model || !(model instanceof Backbone.Model)){
                throw new Error("Invalid model passed as argument");
            }

            var bindings = this._bindings;

            if (bindings){
                bindings[model.cid] = undefined;
                this.stopListening(model, 'change', this._onModelChange);

                var eventName = '.dataBinder.'+model.cid;
                this.$el.off(eventName,this._onElementChange);
            }

        },

        _renderBinding: function(binding){

            var selector = binding.selector;
            var attr = binding.attr;
            var model = binding.model;
            var property = binding.property;
            var value;

            value = (typeof property === 'function') ? property.apply(model) : model.get(property);
            value = binding.negate ? !(!!value) : value;

            var element = (selector == '') ? this.$el : this.$el.find(selector);

            if (element.length > 0){

                switch (attr){
                    case 'value':
                    case 'val' :
                        element.val(value);
                        break;

                    case 'text':
                        element.text(value);
                        break;

                    case 'html':
                        element.html(value);
                        break;

                    case 'width' :
                    case 'height' :
                    case 'selectedIndex':
                        element.prop(attr, value);
                        break;

                    case 'selected':
                    case 'checked':
                    case 'readonly' :
                    case 'visible':
                        value = binding.negate ? !(!!value) : !!value;
                        element.prop(attr, value);
                        break;


                    default:
                        element.attr(attr, value);
                }
            }
            else{
                console.warn("Could not bind value onto '"+selector+"'. No such element found.");
            }
        },

        _onModelChange : function(evt){
            var cid = evt.cid;
            var bindings = this._bindings[cid];
            var changed = evt.changed;

            if (!bindings){
                throw new Error("No bindings found on target for model: '"+cid+'"');
            }

            var self = this;
            _.each(changed, function(value, property){
                var arr = _.where(bindings,{property:property});

                _.each(arr, function(binding){
                    self._renderBinding(binding)
                });
            });
        },

        _onModelBind : function (evt){
            var model = evt;
            var cid = model.cid;
            var bindings = this._bindings;

            if (!bindings|| !bindings[cid]){
                throw new Error("No bindings found on target for model: '"+cid+'"');
            }

            var self = this;
            _.each(bindings[cid], function(binding){
               self._renderBinding(binding);
            });
        },

        _onElementChange : function (evt){
            var model = evt.data.model;
            var property = evt.data.property;
            var attr = evt.data.attr;
            var negate = evt.data.negate;

            var element = Backbone.$(evt.currentTarget);
            var value;

            switch (attr){
                case 'text':
                case 'html':
                    value = element.text();
                    break;

                case 'value':
                case 'val' :
                    value = element.val();
                    break;

                case 'width' :
                case 'height' :
                case 'selectedIndex':
                case 'selected':
                case 'checked':
                case 'readonly' :
                case 'visible':
                    value = element.prop(attr);
                    break;

                default:
                    value = element.attr(attr);
            }

            var valueType = typeof (model.get(property));
            if (valueType === 'number'){
                value = parseFloat(value);
            }else if(valueType === 'boolean'){
                value = negate ? !(!!value) : !!value;
            }

            model.set(property, value);

            return false;
        }

    });

    var delegateEvents = Backbone.View.prototype.delegateEvents;

    var clean = function (str){
        return str.replace(/[|&;$%@"\{\}\\[\]<>()+,]/g, "");
    };

    _.extend(Backbone.View.prototype, Backbone.EZBinder.prototype, {

        delegateEvents : function(){
            delegateEvents.apply(this);
            this.attachBindings();
        },

        attachBindings: function(dataBindings) {

            dataBindings = dataBindings || _.result(this.options, 'dataBindings') || _.result(this, 'dataBindings');

            if (!dataBindings || _.isEmpty(dataBindings) || (!this.model && !this.collection)){
               return this;
            }

            this.detachBindings();

            for (var key in dataBindings){

                var selector='',
                    attr='',
                    bidirectional=false,
                    bidirectionalEvent='';

                if (typeof key !== 'string'){
                    throw new Error("Invalid Model Binding String: '"+key+"'");
                }

                if (key.charAt(0) == '['){
                    var endIndex = key.indexOf(']');
                    if (endIndex < 0){
                        throw new Error("Invalid Model Binding String: '"+key+"'");
                    }

                    attr = key.substring(1, endIndex);
                    selector = Backbone.$.trim(key.substring(endIndex+1));

                    bidirectional = attr.indexOf('@') >= 0;

                    if (bidirectional){
                        var split = attr.split('@');

                        if (split.length >= 1 && split[1]){
                            bidirectionalEvent = Backbone.$.trim(split[0]);
                            attr = Backbone.$.trim(split[1]);
                        }else{
                            attr = Backbone.$.trim(split[0]);
                        }
                    }
                }
                else{
                   selector = Backbone.$.trim(key);
                }


                var property = dataBindings[key];

                if (this.model instanceof Backbone.Model){
                    this.bind(this.model, property, selector, clean(attr), bidirectional, clean(bidirectionalEvent));
                }
                else if (this.model instanceof Backbone.Collection || this.collection instanceof Backbone.Collection){
                    var collection = this.model || this.collection;
                    var self = this;

                    if (modelId){
                        self.bind(collection.get(clean(modelId)),clean(property), selector, clean(attr), bidirectional, clean(bidirectionalEvent), false)
                    }
                    else{
                        _.each(collection.models, function(model, index){
                            self.bind(model, property, selector+":nth-child("+(index+1)+")", clean(attr), bidirectional, clean(bidirectionalEvent), false);
                        });
                    }
                }

            }
        },

        detachBindings : function() {
            if (this.model instanceof Backbone.Model){
                this.unbindAll(this.model);
            }
            else if (this.model instanceof Backbone.Collection || this.collection instanceof Backbone.Collection){
                var collection = this.model || this.collection;
                var self = this;

                _.each(collection.models, function(model){
                    self.unbindAll(model);
                });
            }
        },

        render : function(){
            if (this.model){
                 this.model.trigger('bind', this.model);
            }else if (this.collection){
                this.collection.trigger('bind', this.model);
            }
        }

    });

    return Backbone.EZBinder;
}));