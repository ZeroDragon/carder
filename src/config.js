export const config = {
  port: process.env.PORT || 3000,

  apple: {
    // Using original certificates from certificates/originals/
    passCertificatePath: './certificates/originals/pass.pem',
    passPrivateKeyPath: './certificates/originals/privateKey.key',
    appleWWDRCAPath: './certificates/originals/AppleWWDRCAG4.pem',
    // Your team identifier from Apple Developer portal
    teamIdentifier: '428JSB6QUW',
    // Pass type identifier from Apple Developer portal (e.g., pass.com.yourcompany.card)
    passTypeIdentifier: 'pass.com.xpectros.memberships'
  },

  template: {
    templatePath: './templates',
    defaultBackgroundColor: '#FFFFFF',
    defaultForegroundColor: '#000000',
    defaultLabelColor: '#000000'
  }
}
