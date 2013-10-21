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

    /**
     * EZBinder constructor. Used when creating custom data bindings.
     * @param {string|object} [el=document] Top level DOM element to which all attached bindings will be children of
     * @constructor
     */
    Backbone.EZBinder = function(el){
        this._bindings = {};
        this.$el =  el ? Backbone.$(el) : Backbone.$(document);

        this.$ = function(selector){
            return this.$el.find(selector);
        }
    };

    _.extend(Backbone.EZBinder.prototype, Backbone.Events, {

        _bindings : {},

        /**
         * An object that defines the property related to the model we're binding
         * @typedef PropertyObject
         * @property {string|function} property The name of the property on the model we're binding to (can alternatively be sent as a function to be applied by the model when an associated trigger is fired)
         * @property {boolean} [negate=false] Flag to determine to bind to the inverse value of this property, if said property is of a boolean type
         * @property {triggers} [string[]] A list of properties on the model that will trigger this binding when changed (if none sent then any change to the model will trigger this binding)
         */


        /**
         * Creates a binding between a model property and a DOM Node attribute
         * @param {object} model Backbone Model we're binding to.
         * @param {string | function | PropertyObject} property The model property we're binding to
         * @param {string} [selectors] JQuery selector pointing towards DOM Node we're binding to (if none supplied the binding will point directly to this Binder's 'el' node)
         * @param {string} [attr] Optional attribute or property of DOM Node we're binding to (if none defined we bind to the node's inner text)
         * @param {boolean|string} [bidirectional=false] Flag that determines if this is a bidirectional (two way) binding. Parameter can also be sent as an event string such as 'keyup' if we want something other than the 'change' event to trigger the bidirectional bind
         * @param {boolean} [autRender=true] Flag that tells the binder to attempt to immediately render this binding on its associated DOM Node property
         */
        bind : function (model, property, selector, attr, bidirectional, autoRender){

            if  (!model || !(model instanceof Backbone.Model)){
                throw new Error("Trying to bind an invalid model instance");
            }

            selector = selector || '';
            attr = attr || '';
            autoRender = (autoRender !== undefined) ? autoRender : true;

            var triggers = null,
                negate = false;

            if (typeof property === 'object'){
                triggers = property.triggers;
                negate = !!property.negate;
                property = property.property;
            }

            if (typeof property === 'string' && !triggers){
                triggers = [property];
            }

            if (typeof property !== 'string' && typeof property !== 'function'){
                throw new Error("Attempting to bind to an invalid property");
            }
            else if (typeof property == 'function' && Boolean(bidirectional)){
                throw new Error("Cannot bidirectionally bind to a property that is a function");
            }



            if (triggers){
                for (var i=0; i < triggers.length; i++){
                    if (!model.has(triggers[i])){
                        console.warn("Attempting to bind to undefined model property: "+triggers[i]);
                    }
                }
            }


            var binding = {
                model : model,
                property : property,
                selector : selector,
                attr : attr,
                bidirectional : !!bidirectional,
                triggers : triggers,
                negate :  negate
            };

            this.$el = this.$el || Backbone.$(this.el);

            var bindings = this._bindings[model.cid];

            if (!bindings){
                //If we have no bindings for this model add listeners
                this.listenTo(model, 'change', this._onModelChange, this);
                this.listenTo(model, 'bind', this._onModelBind, this);
                bindings = [binding];
            }

            else{
                //Remove duplicates
                bindings = _.without(bindings, _.findWhere(bindings, {selector : selector, attr : attr}));
                bindings.push(binding);
            }

            this._bindings[model.cid] = bindings;

            //If binding is bidirectional add DOM Listener
            if (!!bidirectional){
                var eventType = (typeof bidirectional === 'string') ? bidirectional : 'change';
                var eventName = eventType+'.ezBinder.'+model.cid+'.'+attr;
                this.$el.on(eventName, selector, binding ,this._onElementChange);
            }

            if (autoRender){
                this._renderBinding(binding);
            }

            return this;

        },

        /**
         * Remove a single data binding
         * @param {number} cid  The id of the model this binding belongs to
         * @param {string} [selector] selector JQuery selector attached to this DOM binding
         * @param {string} [attr] The DOM Node attribute or property attached to this DOM binding
         * @returns {*}
         */
        unbind : function (cid, selector, attr){

            selector = selector || '';
            attr = attr || '';

            var bindings = this._bindings[cid];

            if (bindings){

                var matchingBinding =  _.findWhere(bindings, {selector : selector, attr : attr});

                if (matchingBinding){

                    var model = matchingBinding.model;

                    bindings = _.filter(bindings, function(binding){
                        return binding.selector != selector || binding.attr != attr;
                    });

                    //If model has no more bindings then remove the event listeners
                    if (bindings.length == 0){
                        bindings = undefined;
                        this.stopListening(model, 'change', this._onModelChange);
                        this.stopListening(model, 'bind', this._onModelBind);
                    }

                    if (matchingBinding.bidirectional){
                        this.$el.off('.ezBinder.'+cid+'.'+attr, selector, this._onElementChange);
                    }

                    this._bindings[cid] = bindings;

                }
                else{
                    console.warn("Could not unbind from model: No matching binding for: '"+selector+"' '"+attr+"'");
                }
            }
            else {
                console.warn("Could not unbind from model: Model has no active bindings");
            }

            return this;
        },

        /**
         * Remove all bindings, or all bindings for a particular model
         * @param {number} [cid] Optional id for the model of the bindings we want to remove, if none passed remove all binding for all models
         * @returns {*}
         */
        unbindAll : function (cid){

            var modelBindings = cid ? [this._bindings[cid]] : this._bindings;

            var self = this;
            _.each(modelBindings, function(bindings, cid){

                if (bindings){
                    var model = bindings[0].model;

                    self.stopListening(model, 'change', self._onModelChange);
                    self.$el.off('.ezBinder.'+cid,self._onElementChange);
                    self._bindings[cid] = undefined;
                }

            });

            return this;
        },

        /**
         * Render all current bindings upon their given DOM Nodes
         * @param {number} [cid] Optional id for the model of the bindings we want to render, if none passed render all bindings for all models
         * @returns {*}
         */
        renderBindings : function (cid){

            var modelBindings = cid ? [this._bindings[cid]] : this._bindings;
            var self = this;

            _.each(modelBindings, function(bindings){
                _.each(bindings, function(binding){
                    self._renderBinding(binding);
                });
            });

            return this;
        },

        _onModelChange : function(model){
            var cid = model.cid;
            var bindings = this._bindings[cid];
            var changed = _.keys(model.changed);

            if (!bindings){
                console.warn("No bindings found on target for model: '"+cid+'"');
            }

            var self = this;

            _.each(bindings, function(binding){

                var triggers = binding.triggers;

                if (!triggers || _.intersection(triggers, changed).length > 0){
                    self._renderBinding(binding);
                }
            });
        },

        _renderBinding: function(binding){

            var selector = binding.selector;
            var attr = binding.attr;
            var model = binding.model;
            var property = binding.property;
            var value;

            value = (typeof property === 'function') ? property.apply(model) : model.get(property);
            value = binding.negate ? !(!!value) : value;

            var element = (selector == '') ? this.$el : this.$(selector);

            if (element.length > 0){

                //noinspection FallthroughInSwitchStatementJS
                switch (attr){

                    case '':
                    case 'text':
                        value = (typeof value !== 'undefined') ? value : '';
                        element.text(value);
                        console.log("text1: "+element.text());
                        break;

                    case 'html':
                        value = (typeof value !== 'undefined') ? value : '';
                        element.html(value);
                        break;

                    case 'value':
                    case 'val' :
                        value = (typeof value !== 'undefined') ? value : '';
                        element.val(value);
                        break;

                    case 'width' :
                        element.width(value);
                        console.log(element.width());
                        break;

                    case 'height' :
                        element.height(value);
                        break;

                    case 'selected':
                    case 'checked':
                    case 'readonly' :
                    case 'disabled' :
                        element.prop(attr, !!value);
                        break;

                    case 'display':
                    case 'visible':
                        element.toggle(!!value);
                        break;

                    default:
                        (typeof value !== 'undefined') ?  element.attr(attr, value) : element.removeAttr(attr);
                        break;
                }
            }
            else{
                console.warn("Could not bind value onto '"+selector+"'. No such element found.");
            }
        },


        _onElementChange : function (evt){
            var model = evt.data.model;
            var property = evt.data.property;
            var attr = evt.data.attr;
            var negate = evt.data.negate;

            var element = Backbone.$(evt.currentTarget);
            var value;

            //noinspection FallthroughInSwitchStatementJS
            switch (attr){
                case '':
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
                case 'disabled' :
                   value = element.prop(attr);
                   break;

                case 'display':
                case 'visible':
                   value = element.is(':visible');
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
        return str.replace(/[|;"'\{\}\[\]<>()+,]/g, "");
    };

    var trim = function (str) {
        return Backbone.$.trim(str);
    };

    var logicalOperators = ['=', '>', '<', '!', '&',  '|', '+', '-', '*', '/', '%', '(', ')'];

    /**
     * Test if the given value is a logical expression
     * @param str
     * @returns {boolean}
     */
    var isLogicalExpression = function (str){
        var hasLogic = false;
        for (var i=0; i < str.length; i++){
            var char = str.charAt(i);
            if ( _.contains(logicalOperators,char)){
                hasLogic = true;
            }
            else if (isNaN(char) && char !== ' '){
                return false;
            }
        }
        return hasLogic;
    }

    /**
     * Parse a given property string into a bindable property object
     * @param {string} str
     * @returns {{property: string|function, negate: boolean, triggers: string[]}
     */
    var parsePropertyObject = function (str){

        var property;
        var negate = str.charAt(0) == '!';
        var triggers = str.match(/{([^}]*)}/g);

        if (triggers.length && (triggers[0].length == str.length || (negate && triggers[0].length == str.length-1))){
            property = clean(trim(triggers[0]));
            triggers = [property];
        }
        else{
            negate = false;
            triggers = _.map(triggers, function(trigger){
                str = str.replace(trigger, '{binding}');
                return clean(trim(trigger));
            });

            var split = str.split('{binding}');
            var parseAsLogic = true;
            var funcStr = 'return ';

            //Determine if we're parsing this return value as a logical expression or a string
            for (var i=0; i < split.length; i++){
                if (!isLogicalExpression(split[i])){
                    parseAsLogic = false;
                    break;
                }
            }

            for (i=0; i < split.length; i++){

                if (split[i].length){
                    funcStr += (parseAsLogic) ? split[i] : (i > 0 ? ' + ' : '') + '"' + _.escape(split[i]) + '"' + (i < triggers.length ? ' + ' : '');
                }

                if (i < triggers.length){
                    funcStr += '( this.has(\''+triggers[i]+'\') ? this.get(\''+triggers[i]+'\') : "" )';
                }

            }

            try{
                property = new Function(funcStr);
            }
            catch(e){
                throw new Error("Unable to parse Binding Value: "+str);
            }

        }

        return {
            property : property,
            negate : negate,
            triggers : triggers
        };
    };

    _.extend(Backbone.View.prototype, Backbone.EZBinder.prototype, {

        delegateEvents : function(){
            delegateEvents.apply(this);
            this.attachBindings(null, false);
        },

        /**
         * Manually parses and binds all key/value pairs listed in this view's modelBindings object
         * @param {object[]} [modelBindings]
         * @param {boolean} [autoRender=true]
         * @returns {*}
         */
        attachBindings: function(modelBindings, autoRender) {

            modelBindings = modelBindings || _.result(this.options, 'modelBindings') || _.result(this, 'modelBindings');
            autoRender = (autoRender !== undefined) ? autoRender : true;

            if (!modelBindings || _.isEmpty(modelBindings) || (!this.model && !this.collection)){
               return this;
            }

            this.detachBindings();
            this._bindings = {};

            if (this.model instanceof Backbone.Model){
                this._attachModelBindings(this.model, modelBindings, autoRender);
            }
            else if (this.model instanceof Backbone.Collection){
                this._attachCollectionBindings(this.model, modelBindings, autoRender);
            }
            else if (this.collection instanceof Backbone.Collection){
                this._attachCollectionBindings(this.collection, modelBindings, autoRender);
            }

            return this;
        },

        _attachModelBindings : function(model, modelBindings, autoRender){

            for (var key in modelBindings){

                if (modelBindings.hasOwnProperty(key)){
                    var selector='',
                        attr='',
                        bidirectional= false;

                    if (typeof key !== 'string'){
                        throw new Error("Invalid Model Binding String: '"+key+"'");
                    }

                    if (key.charAt(0) == '['){
                        var endIndex = key.indexOf(']');
                        if (endIndex < 0){
                            throw new Error("Invalid Model Binding String: '"+key+"'");
                        }

                        attr = key.substring(1, endIndex);
                        selector = trim(key.substring(endIndex+1));

                        bidirectional = attr.indexOf('@') >= 0;
                        if (bidirectional){
                            var split = attr.split('@');

                            if (split[0].length){
                                bidirectional = clean(trim(split[0]));
                            }

                            attr = trim(split[1]);

                        }

                        attr = clean(attr);
                    }
                    else{
                        selector = trim(key);
                    }

                    var value = modelBindings[key];
                    var property = (typeof value === 'string') ? parsePropertyObject(value) : value;


                    this.bind(model, property, selector, attr, bidirectional, autoRender);
                }

            }

            return this;
        },

        _attachCollectionBindings : function(collection, collectionBindings, autoRender){

            for (var collectionKey in collectionBindings){

                if (collectionBindings.hasOwnProperty(collectionKey)){

                    var value = collectionBindings[collectionKey];
                    var modelBindings = {};

                    if (typeof value === 'string'){
                        var bracket = value.match(/[^[\]]+(?=])/);
                        if (bracket){

                            var id = clean(bracket[0]);
                            var model = collection.get(id);
                            if (!model && !isNaN(id)){
                                model = collection.at(id);
                            }

                            if (!model){
                                throw new Error("Cannot bind to collection model: No such model with id: '"+id+'"');
                            }

                            modelBindings[collectionKey] = value.replace('['+bracket[0]+']', '');

                            this._attachModelBindings(model, modelBindings, autoRender);
                            continue;
                        }
                        else{
                            value = {'': value}; //convert value into model binding object
                        }
                    }
                    else if (typeof value === 'function'){
                        value = {'': value};  //convert value into model binding object
                    }

                    if (typeof value !== 'object'){
                        throw new Error("Cannot bind to collection model: Value '"+value+"' is an invalid type");
                    }

                    for (var i=0; i < collection.length; i++){

                        modelBindings = {};

                        for (var modelKey in value){

                            if (value.hasOwnProperty(modelKey)){
                                var attr = '';
                                var selector = '';

                                if (modelKey.charAt(0) == '['){
                                    var endIndex = modelKey.indexOf(']');
                                    attr = trim(modelKey.substring(0, endIndex+1));
                                    selector = trim(modelKey.substring(endIndex+1));
                                }
                                else{
                                    selector = trim(modelKey);
                                }


                                var newKey = attr + " " + collectionKey + ":nth-of-type("+(i+1)+")" + " " + selector;
                                modelBindings[newKey] = value[modelKey];
                            }

                        }

                        this._attachModelBindings(collection.at(i), modelBindings, autoRender);
                    }
                }
            }

            this.listenTo(collection,'remove', function(model){
                this.unbindAll(model.cid);
            });

            this.listenTo(collection,'reset', function(){
                this.detachBindings();
            });


            return this;
        },

        /**
         * Detaches the bindings and associated listeners from this view. Does not usually need to be called,
         * as bindings should automatically be cleaned up when view is destroyed.
         * @returns {*}
         */
        detachBindings : function() {
            if (_.isEmpty(this._bindings)) return this;

            this.unbindAll();

            return this;
        },

        render : function(){
            this.renderBindings();

            return this;
        }

    });

    return Backbone.EZBinder;
}));