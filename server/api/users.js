import User from '../../model/Users.js';

export default function ( server, mongoose ) {
  
 // Skapa en global variabel isConnected
  let isConnected = false;

  // GET-route för att hämta alla användare
  server.get( "/api/users/all", async ( req, res ) => {
    try {
      if ( req.query.disconnect === "true" ) {
        if ( isConnected ) {
          await mongoose.disconnect();
          isConnected = false;
        }
      } else {
        if ( !isConnected ) {
          // Reconnect
          await mongoose.connect( "mongodb+srv://yevheniiashcherbakova82:Max260822@cluster0.pnwopeg.mongodb.net/Fitness-Tracker" );
          isConnected = true;
        }
      }
      const users = await User.find();
      if ( users.length === 0 ) {
        return res.status( 404 ).json( { message: 'User not found' } );
      }
      res.status( 200 ).json( users );
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: 'An error occurred on the server while fetching users', error: error.message } );
    }
  } );


  // // GET route for paginated and sorted users
   server.get( '/api/users', async ( req, res ) => {
    try {
      const page = parseInt( req.query.page );
      const limit = parseInt( req.query.limit );

      // Checking the validity of the page and limit
      if ( isNaN( page ) || isNaN( limit ) || page <= 0 || limit <= 0 ) {
        return res.status( 400 ).json( { message: 'Invalid page or limit value. Page and limit must be positive integers.' } );
      }

      const sortField = req.query.sortField || '_id'; // field for sorting
      const sortOrder = req.query.sortOrder || 'asc'; // sorting order

      const sortOptions = {};
      sortOptions[ sortField ] = sortOrder === 'asc' ? 1 : -1;

      const totalUsers = await User.countDocuments( {} );
      const totalPages = Math.ceil( totalUsers / limit );
      const skip = ( page - 1 ) * limit;

      const users = await User.find( {} )
        .sort( sortOptions )
        .skip( skip )
        .limit( limit );

      res.status( 200 ).json( {
        users,
        currentPage: page,
        totalPages,
        totalUsers
      } );
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: 'An error occurred', error } );
    }
  } );


  // Skapar en GET-route för att hämta en specifik användare med ID
  server.get( '/api/users/:id', async ( req, res ) => {
    try {
      const user = await User.findById( req.params.id ); // Hämtar en användare med ID från databasen
      if ( !user ) {
        return res.status( 404 ).json( { message: "User not found" } );
      }
      res.json( user );
    } catch ( error ) {
      res.status( 500 ).json( { message: "An error occurred while searching for user" } );
    }
  } );


  // GET-route för sökning av en användare efter användarnamn
  server.get( '/api/users/username/:username', async ( req, res ) => {
    try {
      const username = req.params.username;
      const user = await User.findOne( { username: username } );
      if ( !user ) {
        return res.status( 404 ).json( { message: 'User - ' + username + ' not found' } );
      }
      res.json( user );
    } catch ( error ) {
      res.status( 500 ).json( { message: "An error occurred while searching for user", error } );
    }
  } );


  // GET-route för sökning av användare efter en del av användarnamn  
  server.get( "/api/users/partOfUsername/:username", async ( req, res ) => {
    try {
      const username = req.params.username;
      // Användук ett uttryck för att söka efter användare utifrån en del av deras namn
      const users = await User.find( { username: { $regex: username, $options: "i" } } );
      if ( users.length === 0 ) {
        return res.status( 404 ).json( {
          message: 'Users with names containing ' + username + ' not found' });
      }
      res.status( 200 ).json( users );
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: "An error occurred while searching for users", error } );
    }
  } );


  // GET-route för sökning av en användare efter email
  server.get( "/api/users/email/:email", async ( req, res ) => {
    try {
      const email = req.params.email;
      const user = await User.findOne( { email: email } );
      if ( !user ) {
        return res.status( 404 ).json( { message: 'User with email ' + email + ' not found' } );
      }
      res.status( 200 ).json( user );
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: "An error occurred while searching for users", error } );
    }
  } );


  // GET-route för sökning av användare efter datumet av konto skapandet
  server.get( '/api/users/createdAt/:date', async ( req, res ) => {
    try {
      const date = req.params.date;
      // Kontrollerar att datumet i förfrågan är i rätt format
      if ( !isValidDate( date ) ) {
        return res.status( 400 ).json( { message: "Invalid date format. Use YYYY-MM-DD format." } );
      }
      // Söker en användare vars konto skapandes datum motsvarar det angivna datumet
      const users = await User.find( { createdAt: { $gte: new Date( date ), $lt: new Date( date + 'T23:59:59.999Z' ) } } );
      if ( users.length === 0 ) {
        return res.status( 404 ).json( {
          message: 'User with account created ' + date + ' not found' } );
      }
      res.status( 200 ).json( users );
    } catch ( error ) {
      res.status( 500 ).json( { message: "An error occurred while retrieving users." } );
    }
  } );

  // Funktion för att kontrollera att datumformatet är korrekt
  function isValidDate ( dateString ) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test( dateString );
  }


  // GET-route för sökning av användare som har skapat ett konto under ett visst tidsperiod
  server.get( '/api/users/createdAt/:startDate/:endDate', async ( req, res ) => {
    try {
      // Konvertera parametrarna startDate och endDate till Date-objekt
      const startDate = new Date( req.params.startDate );
      const endDate = new Date( req.params.endDate );

      // Kontrollerar att datumen är korrekta
      if ( isNaN( startDate.getTime() ) || isNaN( endDate.getTime() ) ) {
        return res.status( 400 ).json( { message: "Invalid date format. Use YYYY-MM-DD format." } );
      }

      // Hämtar användare skapade inom ett givet tidsintervall
      const users = await User.find( { createdAt: { $gte: startDate, $lte: endDate } } );
      if ( users.length === 0 ) {
        return res.status( 404 ).json( { message: 'Users with account created in specified time period not found' } );
      }
      res.status( 200 ).json( users );
    } catch ( error ) {
      res.status( 500 ).json( { message: "An error occurred on the server while retrieving users after the creation date.", error } );
    }
  } );


  // Create a POST route to add a new user
  server.post( '/api/users', async ( req, res ) => {
    try {
      // Check for the presence of required parameters
      const requiredFields = [ 'username', 'email', 'password' ];
      const missingFields = requiredFields.filter( field => !req.body.hasOwnProperty( field ) );

      if ( missingFields.length > 0 ) {
        return res.status( 400 ).json( { message: `Missing required field(s): ${ missingFields.join( ', ' ) }` } );
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test( req.body.email );
      if ( !isValidEmail ) {
        return res.status( 400 ).json( { message: "Invalid email format" } );
      }

      // Check for an existing user with the specified email
      const existingEmail = await User.findOne( { email: req.body.email } );
      if ( existingEmail ) {
        return res.status( 400 ).json( { message: 'Email already exists' } );
      }

      // Check for an existing user with the specified username
      const existingUsername = await User.findOne( { username: req.body.username } );
      if ( existingUsername ) {
        return res.status( 400 ).json( { message: 'Username already exists' } );
      }

      // Create a new user
      const newUser = new User( {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        createdAt: req.body.createdAt
      } );

      const savedUser = await newUser.save();
      res.status( 201 ).json( savedUser ); // Create user in JSON format
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: 'An error occurred on the server while creating a new user', error: error.message } );
    }
  } );

  
  // Skapar en PUT-route för att uppdatera en användare med ett specifikt ID.
  server.put( '/api/users/:id', async ( req, res ) => {
    try {
      if ( req.query.disconnect === "true" ) {
        if ( isConnected ) {
          await mongoose.disconnect();
          isConnected = false;
        }
      } else {
        if ( !isConnected ) {
          // Reconnect
          await mongoose.connect( "mongodb+srv://yevheniiashcherbakova82:Max260822@cluster0.pnwopeg.mongodb.net/Fitness-Tracker" );
          isConnected = true;
        }
      }
      const updatedUser = await User.findByIdAndUpdate( req.params.id, req.body );

      if ( !updatedUser ) {
        return res.status( 404 ).json( { message: 'User not found' } );
      }
      res.json( updatedUser );
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: 'An error occurred on the server while updating a user', error: error.message } );
    }
  } );


  //Skapar en DELETE-route för att radera en användare med ett specifikt ID.
  server.delete( '/api/users/:id', async ( req, res ) => {
    try {
      if ( req.query.disconnect === "true" ) {
        if ( isConnected ) {
          await mongoose.disconnect();
          isConnected = false;
        }
      } else {
        if ( !isConnected ) {
          // Reconnect
          await mongoose.connect( "mongodb+srv://yevheniiashcherbakova82:Max260822@cluster0.pnwopeg.mongodb.net/Fitness-Tracker" );
          isConnected = true;
        }
      }
      const deletedUser = await User.findByIdAndDelete( req.params.id );
      if ( !deletedUser ) {
        return res.status( 404 ).json( { message: "User not found" } );
      }
      res.status( 200 ).json( { message: "User deleted successfully." } ); // Bekräftelse på att användaren har raderats.
    } catch ( error ) {
      console.error( error );
      res.status( 500 ).json( { message: 'An error occurred on the server while removing of user', error: error.message } );
    }
  } );
  
}



