import { uploadSystemContent } from './upload-system-content';

uploadSystemContent()
  .then(() => {
    console.log('Seed completed.');
  })
  .catch(error => {
    console.error('Seed failed:', error);
  });