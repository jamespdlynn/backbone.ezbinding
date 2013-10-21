describe("ezBinder", function(){
    'use strict';

    var Model = Backbone.Model.extend({
         defaults : {
             label : "foo",
             number : 1,
             flag : false
         }
    });

    var ezBinder;

    before(function(){
        $('body').append($('#view-template').html());
        ezBinder = new Backbone.EZBinder('#view');
    });

    after(function(){
        ezBinder.unbindAll();
        $('#view').remove();
    });

    describe("basic property binding", function(){

        var model, span;

        before(function (){

            model = new Model();
            span = ezBinder.$('#span');

            ezBinder.bind(model, 'label', '#span');
            ezBinder.bind(model, 'label', '#span', 'data-label');
            ezBinder.bind(model, 'number', '#span', 'width');
            ezBinder.bind(model, 'number', '#span', 'value');
            ezBinder.bind(model, 'flag', '#span', 'visible');
            ezBinder.bind(model, 'flag', '#span', 'disabled');
        });

        after(function(){
            ezBinder.unbindAll();
        });


        it("binding rendering", function(){

            assert.equal(span.text(), "foo", "default rendering");
            assert.equal(span.attr('data-label'), "foo", "attribute rendering");
            assert.equal(span.width(), 1, "width rendering");
            assert.equal(span.val(), 1, "value rendering");
            assert.equal(span.css('display'), 'none', "visibility rendering");
            assert.isFalse(span.prop('disabled'), "property rendering");
        });

        it('binding change listeners', function(){

            model.unset('label');
            assert.isUndefined(span.attr('data-label'));

            model.set('label', 'bar');
            assert.equal(span.text(), "bar");
            assert.isDefined(span.attr('data-label'));

            model.set('number',2);
            assert.equal(span.width(), 2);
        });

        it('unbinding', function(){

            ezBinder.unbind(model.cid, '#span');
            model.set('label', 'goo');
            assert.notEqual(span.text(), 'goo');
            assert.equal(span.attr('data-label'), 'goo');

            ezBinder.unbindAll(model.cid);
            model.set('number',3);
            assert.notEqual(span.width(), 3);
        });

    });

    describe("property object binding", function(){


        var model, span, labelFunc;


        before(function (){
            model = new Model();
            span = ezBinder.$('#span');
            labelFunc = function(){
                return this.get('label')+'bar';
            }
        });

        afterEach(function(){
            ezBinder.unbindAll();
        });

        it("function binding", function(){

            ezBinder.bind(model, labelFunc, '#span');

            assert.equal(span.text(), "foobar");
            model.set('label','bar');
            assert.equal(span.text(), "barbar");
        });

        it('negation binding', function(){


            ezBinder.bind(model, {property:'flag', negate:true}, '#span', 'disabled');

           model.set('flag', false);
           assert.isTrue(span.prop('disabled'));
           model.set('flag',true);
           assert.isFalse(span.prop('disabled'));
        });

        it('binding triggers', function(){


            ezBinder.bind(model, {property:labelFunc, triggers:['flag','number']}, '#span', 'value');

            model.set('label', 'goo');
            assert.notEqual(span.val(), 'goobar');

            model.set('number', 2);
            assert.equal(span.val(), 'goobar');
        });

    });

    describe("bidirectional binding", function(){

        var model, input;

        before(function (){
            model = new Model();
            input = ezBinder.$('#input');
        });

        afterEach(function(){
            ezBinder.unbindAll();
        });

        it("invalid bind", function(){
            var invalidBindFunc = function(){ ezBinder.bind(model, function(){return ''}, '#input', 'value', true); }
            assert.throw(invalidBindFunc, Error);
        });

        it('default event', function(){

           ezBinder.bind(model, 'label', '#input', 'value', true);
           ezBinder.bind(model, 'number', '#input', 'width', true);

           input.val('fizz').change();
           assert.equal(model.get('label'), 'fizz');

           input.width(100).change();
           assert.deepEqual(model.get('number'), 100);
        });

        it('custom event', function(){
            model.set('flag', false);
            ezBinder.bind(model, 'flag', '#input', 'disabled', 'keyup');

            input.prop('disabled',true).change();
            assert.isFalse(model.get('flag'));

            input.keyup();
            assert.isTrue(model.get('flag'));
        });


        it("unbind", function(){
            ezBinder.bind(model, 'label', '#input', 'value', true);
            input.val('fizz').change();
            assert.equal(model.get('label'), 'fizz');

            ezBinder.unbind(model.cid, '#input', 'value');
            input.val('buzz').change();
            assert.notEqual(model.get('label'), 'buzz');
        });

    });
});