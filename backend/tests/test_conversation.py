from app.conversation import greeting_response


def test_english_and_french_greetings_are_handled_locally():
    assert "Hello!" in greeting_response("Hi!")
    assert "Bonjour" in greeting_response("Bonjour !")
    assert "Avec plaisir" in greeting_response("Merci beaucoup")


def test_substantive_questions_are_not_misclassified_as_greetings():
    assert greeting_response("Hi, can you explain the access policy?") is None
    assert greeting_response("Does it support French?") is None
