// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  apis: {
    httpServer: 'http://localhost:3000',
    wsServer: 'ws://localhost:3000',
    thumbnails: {
      set: '/setThumbnail',
      removeFolder: '/removeFolderThumbnail'
    },
    application: {
      state: '/state',
      processMedia: '/processMedia',
      login: '/login',
      logout: '/logout'
    },
    uploads: '/upload',
    deleteMedia: '/delete',
    newFolder: '/newfolder',
    moveResource: '/move',
    renameResource: '/renameResource'
  },
  application: {
    showStart: false,
    showUpload: true,
    showNewFolder: true,
    canDelete: true,
    showFooter: true,
    showImageLegend: true
  },
  video: {
    playbackRateIncrement: 0.1,
    startMuted: false
  },
  timers: {
  },
  grid: {
    gridItemWidth: 200,
    gridItemWidthWithMargin: 210,
    previewMaxHeight: 150
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
