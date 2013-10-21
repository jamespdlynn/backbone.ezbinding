define(['backbone.ezbinding'], function(EZBinder){

    describe("Backbone.EzBinding in CommonJS environment", function() {

        it("should be the same as the non-CommonJS usage", function(){
            assert.equal(Backbone.EZBinder, EZBinder);
        });
    });
});

