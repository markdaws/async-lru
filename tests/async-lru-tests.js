var should = require('should'),
    Async = require('async'),
    AsyncLRU = require('../').LRU;

var _id = 0;
function Item() {
    this.disposed = false;
    this.key = _id++;
    this.dispose = function(callback) {
        this.disposed = true;
        process.nextTick(callback);
    };
}

describe('AsyncLRU', function() {

    it('get with invalid key returns null', function(done) {
        var lru = new AsyncLRU({ max: 10 });
        should.not.exist(lru.get('foo'));
        done();
    });

    it('set adds an item to the cache with the correct key', function(done) {

        var lru = new AsyncLRU({ max: 10 });
        var i1 = new Item();

        lru.set(i1.key, i1, function(error) {
            if (error) throw error;

            lru.get(i1.key).should.equal(i1);
            done();
        });
    });

    it('setting an object with the same key, should dispose old object', function(done) {

        var lru = new AsyncLRU({ max: 10 });
        var i1 = new Item(), i2 = new Item();

        lru.set(i1.key, i1, function(error) {
            if (error) throw error;

            lru.set(i1.key, i2, function(error) {
                if (error) throw error;

                i1.disposed.should.equal(true);
                lru.get(i1.key).should.equal(i2);
                done();
            });
        });        
    });

    it('dispose should call dispose on all items in the cache', function(done) {
        
        var lru = new AsyncLRU({ max: 10 });

        var items = [new Item(), new Item(), new Item()];
        Async.forEachLimit(
            items,
            1,
            function(item, callback) {
                lru.set(item.key, item, function(error) {
                    callback(error);
                });
            },
            function(error) {
                if (error) throw error;

                lru.dispose(function(error) {
                    if (error) throw error;

                    for(var i=0; i<items.length; ++i) {
                        if (!items[i].disposed) {
                            throw Error('Item not disposed:' + items[i].key);
                        }
                    }
                    done();
                });
            }
        );
    });

    it('adding an object that causes cache to exceed max should dispose oldest item', function(done) {
        var lru = new AsyncLRU({ max: 2 });
        var i1 = new Item(), i2 = new Item(), i3 = new Item();

        lru.set(i1.key, i1, function(error) {
            if (error) throw error;

            lru.set(i2.key, i2, function(error) {
                if (error) throw error;

                lru.set(i3.key, i3, function(error) {
                    if (error) throw error;

                    should.not.exist(lru.get(i1.key));
                    i1.disposed.should.equal(true);
                    done();
                });
            });
        });                
    });

    it('oldest item becomes newest', function(done) {
    });


    // remove item not exist error missing
    // remove item in middle of lru
    // remove item at the head of the lru
});