'use strict';

var angular = require('angular');

// Fake implementation of the API for fetching annotations and replies to
// annotations.
function FakeApi(annots) {
  this.annots = annots;

  this.annotation = {
    get: function (query) {
      var result;
      if (query.id) {
        result = annots.find(function (a) {
          return a.id === query.id;
        });
      }
      return Promise.resolve(result);
    },
  };

  this.search = function (query) {
    var result;
    if (query.references) {
      result = annots.filter(function (a) {
        return a.references && a.references.indexOf(query.references) !== -1;
      });
    }
    return Promise.resolve({rows: result});
  };
}

describe('annotationViewerContent', function () {

  before(function () {
    angular.module('h', [])
      .component('annotationViewerContent',
        require('../annotation-viewer-content'))
      .config(($compileProvider) => $compileProvider.preAssignBindingsEnabled(true));
  });

  beforeEach(angular.mock.module('h'));

  function createController(opts) {
    var locals = {
      $location: {},
      $routeParams: { id: 'test_annotation_id' },
      annotationUI: {
        setAppIsSidebar: sinon.stub(),
        setCollapsed: sinon.stub(),
        highlightAnnotations: sinon.stub(),
        subscribe: sinon.stub(),
      },
      api: opts.api,
      rootThread: {thread: sinon.stub()},
      streamer: {
        setConfig: function () {},
        connect: function () {},
      },
      streamFilter: {
        setMatchPolicyIncludeAny: function () {
          return {
            addClause: function () {
              return {
                addClause: function () {},
              };
            },
          };
        },
        getFilter: function () {},
      },
      annotationMapper: {
        loadAnnotations: sinon.spy(),
      },
    };

    var $componentController;
    angular.mock.inject(function (_$componentController_) {
      $componentController = _$componentController_;
    });
    locals.ctrl = $componentController('annotationViewerContent', locals, {
      search: {},
    });
    return locals;
  }

  describe('the standalone view for a top-level annotation', function () {
    it('loads the annotation and all replies', function () {
      var fakeApi = new FakeApi([
        {id: 'test_annotation_id'},
        {id: 'test_reply_id', references: ['test_annotation_id']},
      ]);
      var controller = createController({api: fakeApi});
      return controller.ctrl.ready.then(function () {
        assert.calledOnce(controller.annotationMapper.loadAnnotations);
        assert.calledWith(controller.annotationMapper.loadAnnotations,
          sinon.match(fakeApi.annots));
      });
    });

    it('does not highlight any annotations', function () {
      var fakeApi = new FakeApi([
        {id: 'test_annotation_id'},
        {id: 'test_reply_id', references: ['test_annotation_id']},
      ]);
      var controller = createController({api: fakeApi});
      return controller.ctrl.ready.then(function () {
        assert.notCalled(controller.annotationUI.highlightAnnotations);
      });
    });
  });

  describe('the standalone view for a reply', function () {
    it('loads the top-level annotation and all replies', function () {
      var fakeApi = new FakeApi([
        {id: 'parent_id'},
        {id: 'test_annotation_id', references: ['parent_id']},
      ]);
      var controller = createController({api: fakeApi});
      return controller.ctrl.ready.then(function () {
        assert.calledWith(controller.annotationMapper.loadAnnotations,
          sinon.match(fakeApi.annots));
      });
    });

    it('expands the thread', function () {
      var fakeApi = new FakeApi([
        {id: 'parent_id'},
        {id: 'test_annotation_id', references: ['parent_id']},
      ]);
      var controller = createController({api: fakeApi});
      return controller.ctrl.ready.then(function () {
        assert.calledWith(controller.annotationUI.setCollapsed, 'parent_id', false);
        assert.calledWith(controller.annotationUI.setCollapsed, 'test_annotation_id', false);
      });
    });

    it('highlights the reply', function () {
      var fakeApi = new FakeApi([
        {id: 'parent_id'},
        {id: 'test_annotation_id', references: ['parent_id']},
      ]);
      var controller = createController({api: fakeApi});
      return controller.ctrl.ready.then(function () {
        assert.calledWith(controller.annotationUI.highlightAnnotations,
          sinon.match(['test_annotation_id']));
      });
    });
  });
});
